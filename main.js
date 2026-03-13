const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================

   function getShiftDuration(startTime, endTime) {
    function toSeconds(timeStr) {
        timeStr = timeStr.trim();
        const parts = timeStr.split(' ');
        const period = parts[1].toLowerCase();
        const timePart = parts[0];
        let [h, m, s] = timePart.split(':').map(Number);

        if (period === 'pm' && h !== 12) h += 12;
        if (period === 'am' && h === 12) h = 0;

        return h * 3600 + m * 60 + s;
    }

    let startSec = toSeconds(startTime);
    let endSec = toSeconds(endTime);

    if (endSec < startSec) {
        endSec += 24 * 3600;
    }

    let diff = endSec - startSec;

    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;

    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    function toSeconds(timeStr) {
        timeStr = timeStr.trim();
        const parts = timeStr.split(' ');
        const period = parts[1].toLowerCase();
        const timePart = parts[0];
        let [h, m, s] = timePart.split(':').map(Number);

        if (period === 'pm' && h !== 12) h += 12;
        if (period === 'am' && h === 12) h = 0;

        return h * 3600 + m * 60 + s;
    }

    const deliveryStart = 8 * 3600;   
    const deliveryEnd = 22 * 3600;   

    let startSec = toSeconds(startTime);
    let endSec = toSeconds(endTime);

    if (endSec < startSec) endSec += 24 * 3600;

    let idleBefore = Math.max(0, deliveryStart - startSec);
    let idleAfter = Math.max(0, endSec - deliveryEnd);

    let totalIdle = idleBefore + idleAfter;

    const h = Math.floor(totalIdle / 3600);
    const m = Math.floor((totalIdle % 3600) / 60);
    const s = totalIdle % 60;

    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    function toSeconds(timeStr) {
        let [h, m, s] = timeStr.trim().split(':').map(Number);
        return h * 3600 + m * 60 + s;
    }

    let diff = toSeconds(shiftDuration) - toSeconds(idleTime);

    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;

    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    function toSeconds(timeStr) {
        let [h, m, s] = timeStr.trim().split(':').map(Number);
        return h * 3600 + m * 60 + s;
    }

    const [year, month, day] = date.split('-').map(Number);

    let quota;
    if (year === 2025 && month === 4 && day >= 10 && day <= 30) {
        quota = 6 * 3600; 
    } else {
        quota = 8 * 3600 + 24 * 60; 
    }

    return toSeconds(activeTime) >= quota;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    const { driverID, driverName, date, startTime, endTime } = shiftObj;

    let lines = [];
    try {
        const content = fs.readFileSync(textFile, 'utf8');
        lines = content.split('\n').filter(line => line.trim() !== '');
    } catch (e) {
        lines = [];
    }

    
    for (let line of lines) {
        const cols = line.split(',');
        if (cols[0].trim() === driverID && cols[2].trim() === date) {
            return {};
        }
    }

    const shiftDuration = getShiftDuration(startTime, endTime);
    const idleTime = getIdleTime(startTime, endTime);
    const activeTime = getActiveTime(shiftDuration, idleTime);
    const quota = metQuota(date, activeTime);
    const hasBonus = false;

    const newRecord = `${driverID},${driverName},${date},${startTime},${endTime},${shiftDuration},${idleTime},${activeTime},${quota},${hasBonus}`;

    let lastIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].split(',')[0].trim() === driverID) {
            lastIndex = i;
        }
    }

    if (lastIndex === -1) {
        lines.push(newRecord);
    } else {
        lines.splice(lastIndex + 1, 0, newRecord);
    }

    fs.writeFileSync(textFile, lines.join('\n') + '\n', 'utf8');

    return {
        driverID, driverName, date, startTime, endTime,
        shiftDuration, idleTime, activeTime,
        metQuota: quota, hasBonus
    };
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    let content = fs.readFileSync(textFile, 'utf8');
    let lines = content.split('\n').filter(line => line.trim() !== '');

    for (let i = 0; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols[0].trim() === driverID && cols[2].trim() === date) {
            cols[9] = newValue;
            lines[i] = cols.join(',');
            break;
        }
    }

    fs.writeFileSync(textFile, lines.join('\n') + '\n', 'utf8');
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    const content = fs.readFileSync(textFile, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() !== '');

    let driverExists = false;
    let count = 0;

    for (let line of lines) {
        const cols = line.split(',');
        if (cols[0].trim() === driverID) {
            driverExists = true;
            const recordMonth = parseInt(cols[2].trim().split('-')[1]);
            if (recordMonth === parseInt(month)) {
                if (cols[9].trim() === 'true') {
                    count++;
                }
            }
        }
    }

    if (!driverExists) return -1;
    return count;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    const content = fs.readFileSync(textFile, 'utf8');
    const lines = content.split('\n').filter(line => line.trim() !== '');

    let totalSeconds = 0;

    for (let line of lines) {
        const cols = line.split(',');
        if (cols[0].trim() === driverID) {
            const recordMonth = parseInt(cols[2].trim().split('-')[1]);
            if (recordMonth === month) {
                const [h, m, s] = cols[7].trim().split(':').map(Number);
                totalSeconds += h * 3600 + m * 60 + s;
            }
        }
    }

    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    const shifts = fs.readFileSync(textFile, 'utf8')
        .split('\n').filter(line => line.trim() !== '');
    const rates = fs.readFileSync(rateFile, 'utf8')
        .split('\n').filter(line => line.trim() !== '');

    let dayOff = null;
    for (let line of rates) {
        const cols = line.split(',');
        if (cols[0].trim() === driverID) {
            dayOff = cols[1].trim().toLowerCase();
            break;
        }
    }

    const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];

    let totalSeconds = 0;

    for (let line of shifts) {
        const cols = line.split(',');
        if (cols[0].trim() === driverID) {
            const dateParts = cols[2].trim().split('-');
            const recordMonth = parseInt(dateParts[1]);
            if (recordMonth === month) {
                const dateObj = new Date(cols[2].trim());
                const dayName = dayNames[dateObj.getDay()];
                if (dayName === dayOff) continue;

                const year = parseInt(dateParts[0]);
                const day = parseInt(dateParts[2]);
             
                if (year === 2025 && recordMonth === 4 && day >= 10 && day <= 30) {
                    totalSeconds += 6 * 3600;
                } else {
                    totalSeconds += 8 * 3600 + 24 * 60;
                }
            }
        }
    }

    totalSeconds -= bonusCount * 2 * 3600;

    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    const rates = fs.readFileSync(rateFile, 'utf8')
        .split('\n').filter(line => line.trim() !== '');

    let basePay, tier;
    for (let line of rates) {
        const cols = line.split(',');
        if (cols[0].trim() === driverID) {
            basePay = parseInt(cols[2].trim());
            tier = parseInt(cols[3].trim());
            break;
        }
    }

    function toSeconds(timeStr) {
        const [h, m, s] = timeStr.trim().split(':').map(Number);
        return h * 3600 + m * 60 + s;
    }

    const actualSec = toSeconds(actualHours);
    const requiredSec = toSeconds(requiredHours);

    let missingSec = requiredSec - actualSec;

    if (missingSec <= 0) return basePay;

    const allowedHours = { 1: 50, 2: 20, 3: 10, 4: 3 };
    const allowed = allowedHours[tier] * 3600;

    missingSec -= allowed;

    if (missingSec <= 0) return basePay;

    const missingHours = Math.floor(missingSec / 3600);

    const deductionRate = Math.floor(basePay / 185);
    const deduction = missingHours * deductionRate;

    return basePay - deduction;
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
