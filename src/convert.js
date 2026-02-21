import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";
import readline from "readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, "..");
const inputDir = path.join(rootDir, "input");
const outputDir = path.join(rootDir, "output");

// 퀄리티 맵 설정
const qualityMap = {
    1: { name: "상", value: 90, key: "high" },
    2: { name: "중", value: 80, key: "mid" },
    3: { name: "하", value: 70, key: "low" },
};

function ensureDirs() {
    if (!fs.existsSync(inputDir)) fs.mkdirSync(inputDir);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);
}

async function convertImages(quality, label) {
    const files = fs.readdirSync(inputDir);
    const supportedExtensions = [".jpg", ".jpeg", ".png", ".tiff", ".gif", ".bmp"];
    const imageFiles = files.filter((file) => supportedExtensions.includes(path.extname(file).toLowerCase()));

    if (imageFiles.length === 0) {
        console.log("\n[!] 변환할 이미지가 input 폴더에 없습니다.");
        return;
    }

    // 품질 수치 제한 (1~100)
    const finalQuality = Math.min(Math.max(parseInt(quality) || 80, 1), 100);
    
    console.log(`\n[START] 퀄리티: ${label} (${finalQuality}%)로 변환을 시작합니다...`);

    for (const file of imageFiles) {
        const inputPath = path.join(inputDir, file);
        const outputName = path.parse(file).name + ".webp";
        const outputPath = path.join(outputDir, outputName);

        try {
            await sharp(inputPath)
                .webp({ quality: finalQuality, effort: 4 })
                .toFile(outputPath);
            console.log(` OK: ${file} -> ${outputName}`);
        } catch (err) {
            console.error(` ERR: ${file} 변환 실패 - ${err.message}`);
        }
    }

    console.log("\n[DONE] 모든 작업이 완료되었습니다!");
}

function showMenu() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    console.clear();
    console.log("============================================");
    console.log("  img2webp - 이미지 일괄 변환 (to WebP)");
    console.log("============================================");
    console.log("");
    console.log("  [1] 퀄리티: 상 (90%)");
    console.log("  [2] 퀄리티: 중 (80%) - 추천");
    console.log("  [3] 퀄리티: 하 (70%)");
    console.log("  [4] 직접 입력 (1~100 사이 숫자)");
    console.log("");
    console.log("  [0] 종료");
    console.log("");
    console.log("============================================");

    rl.question("번호를 입력하세요 (기본값 2): ", async (answer) => {
        const choice = answer.trim() || "2";

        if (choice === "0") {
            console.log("프로그램을 종료합니다.");
            rl.close();
            return;
        }

        if (qualityMap[choice]) {
            await convertImages(qualityMap[choice].value, qualityMap[choice].name);
            rl.close();
        } else if (choice === "4") {
            rl.question("\n원하는 퀄리티 숫자를 입력하세요 (1-100): ", async (customQ) => {
                const q = parseInt(customQ);
                if (isNaN(q) || q < 1 || q > 100) {
                    console.log("\n[!] 1에서 100 사이의 올바른 숫자를 입력해 주세요.");
                    rl.close();
                    setTimeout(showMenu, 1500); // 잠시 후 메뉴 재표시
                } else {
                    await convertImages(q, `직접설정`);
                    rl.close();
                }
            });
        } else {
            console.log("\n[!] 잘못된 선택입니다. 다시 입력해 주세요.");
            rl.close();
            setTimeout(showMenu, 1000);
        }
    });
}

// 실행부
ensureDirs();
const arg = process.argv[2];

if (arg) {
    // CLI 인자가 있는 경우 (예: node src/convert.js 95 또는 node src/convert.js high)
    let q = 80;
    let label = "기본값";

    if (arg === "high") { q = 90; label = "상"; }
    else if (arg === "mid") { q = 80; label = "중"; }
    else if (arg === "low") { q = 70; label = "하"; }
    else if (!isNaN(arg)) { q = parseInt(arg); label = "인자입력"; }

    convertImages(q, label);
} else {
    // 인자 없으면 인터렉티브 메뉴 실행
    showMenu();
}
