import fs from 'fs';
import readline from 'readline';

const fileStream = fs.createReadStream('C:/Users/user/.gemini/antigravity/brain/2d9dd98c-c910-4c45-8aae-0893980d0653/.system_generated/logs/transcript_full.jsonl');

const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
});

let lineNum = 0;
for await (const line of rl) {
    lineNum++;
    if (line.includes('USER_INPUT')) {
        if (line.includes('池袋') || line.includes('葛西')) {
            const obj = JSON.parse(line);
            console.log(`[Line ${lineNum} - Step ${obj.step_index}]`);
            console.log(obj.content);
            console.log('-----------------------------------');
        }
    }
}
