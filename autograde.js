const fs = require('fs');
const { spawn } = require('child_process');
const newman = require('newman');

// 1. Copy config files
if (!fs.existsSync('config')) {
    fs.mkdirSync('config');
}
fs.copyFileSync('__tests__/config.env', 'config/config.env');
fs.copyFileSync('__tests__/pgdb.js', 'config/pgdb.js');
console.log("✅ Copied config.env and pgdb.js to config folder.");

// 2. Start API Server (สมมติว่าเซิร์ฟเวอร์รันผ่าน index.js)
console.log("🚀 Starting API Server...");
const server = spawn('node', ['index.js']);

server.stdout.on('data', (data) => console.log(`[Server] ${data.toString().trim()}`));
server.stderr.on('data', (data) => console.error(`[Server Error] ${data.toString().trim()}`));

// หน่วงเวลา 4 วินาทีให้ Express เปิดและต่อ Database จนเสร็จ ก่อนรัน Newman
setTimeout(() => {
    console.log("🧪 Running Postman collection via Newman...");
    
    newman.run({
        collection: require('./__tests__/PM.json'),
        reporters: ['json'], // ใช้ json reporter เพื่อเอาค่ามาคำนวณคะแนน
        reporter: { json: { export: 'newman-results.json' } }
    }, function (err) {
        
        server.kill(); // ปิดเซิร์ฟเวอร์เมื่อเทสต์เสร็จแล้ว
        
        if (err) {
            console.error('Newman execution failed:', err);
            process.exit(1);
        }
        
        // 3. คำนวณคะแนน
        const results = JSON.parse(fs.readFileSync('newman-results.json', 'utf8'));
        const totalAssertions = results.run.stats.assertions.total;
        const failedAssertions = results.run.stats.assertions.failed;
        const score = totalAssertions - failedAssertions;

        // 4. สร้างไฟล์ grade.json และ grade.md
        const gradeData = { totalAssertions, failedAssertions, score };
        fs.writeFileSync('grade.json', JSON.stringify(gradeData, null, 2));

        const mdContent = `## 📝 สรุปคะแนน (Autograding Results)\n\n- **Total Assertions (ผ่านทั้งหมด):** ${totalAssertions}\n- **Failed Assertions (ข้อผิดพลาด):** ${failedAssertions}\n- **คะแนนสุทธิ:** ${score} / ${totalAssertions}\n`;
        fs.writeFileSync('grade.md', mdContent);
        
        console.log(`✅ Grading Complete! Score: ${score} / ${totalAssertions}`);
        process.exit(0);
    });
}, 4000);