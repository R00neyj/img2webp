import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";
import readline from "readline/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, "..");
const inputDir = path.join(rootDir, "input");
const outputDir = path.join(rootDir, "output");

// 퀄리티 프리셋 설정
const qualityPresets = {
    1: { name: "최상", value: 96, key: "ultra" },
    2: { name: "상", value: 90, key: "high" },
    3: { name: "중", value: 80, key: "mid" },
    4: { name: "하", value: 70, key: "low" },
};

function ensureDirs() {
    if (!fs.existsSync(inputDir)) fs.mkdirSync(inputDir, { recursive: true });
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * 이미지들을 병렬 처리(배치 단위)로 변환
 */
async function processBatch(files, quality, label) {
    const supportedExtensions = [".jpg", ".jpeg", ".png", ".tiff", ".gif", ".bmp"];
    const imageFiles = files.filter((file) => supportedExtensions.includes(path.extname(file).toLowerCase()));

    if (imageFiles.length === 0) {
        console.log("\n[!] 변환할 이미지가 input 폴더에 없습니다.");
        return;
    }

    const finalQuality = Math.min(Math.max(parseInt(quality) || 80, 1), 100);
    console.log(`\n[START] 퀄리티: ${label} (${finalQuality}%)로 변환을 시작합니다 (총 ${imageFiles.length}개)...`);

    const stats = { success: 0, fail: 0 };
    const batchSize = 5; // 동시 처리 개수

    for (let i = 0; i < imageFiles.length; i += batchSize) {
        const batch = imageFiles.slice(i, i + batchSize);
        const promises = batch.map(async (file) => {
            const inputPath = path.join(inputDir, file);
            const outputName = path.parse(file).name + ".webp";
            const outputPath = path.join(outputDir, outputName);

            try {
                await sharp(inputPath)
                    .webp({ quality: finalQuality, effort: 4 })
                    .toFile(outputPath);
                console.log(` [+] OK: ${file} -> ${outputName}`);
                stats.success++;
            } catch (err) {
                console.error(` [-] ERR: ${file} 변환 실패 - ${err.message}`);
                stats.fail++;
            }
        });

        await Promise.all(promises);
        const progress = Math.min(i + batchSize, imageFiles.length);
        console.log(`[PROGRESS] ${progress}/${imageFiles.length} 완료...`);
    }

    console.log("\n============================================");
    console.log(`[DONE] 모든 작업 완료!`);
    console.log(` - 성공: ${stats.success}개`);
    console.log(` - 실패: ${stats.fail}개`);
    console.log("============================================\n");
}

async function showMenu() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    while (true) {
        console.log("============================================");
        console.log("  img2webp - 이미지 일괄 변환 (to WebP)");
        console.log("============================================");
        console.log("");
        console.log("  [1] 퀄리티: 최상 (96%)");
        console.log("  [2] 퀄리티: 상   (90%)");
        console.log("  [3] 퀄리티: 중   (80%) - 추천");
        console.log("  [4] 퀄리티: 하   (70%)");
        console.log("  [5] 직접 입력 (1~100 사이 숫자)");
        console.log("");
        console.log("  [0] 종료");
        console.log("");
        console.log("============================================");

        const answer = await rl.question("선택하세요 (기본값 3): ");
        const choice = answer.trim() || "3";

        if (choice === "0") {
            console.log("프로그램을 종료합니다.");
            break;
        }

        if (qualityPresets[choice]) {
            const files = fs.readdirSync(inputDir);
            await processBatch(files, qualityPresets[choice].value, qualityPresets[choice].name);
        } else if (choice === "5") {
            const customQ = await rl.question("\n원하는 퀄리티 숫자를 입력하세요 (1-100): ");
            const q = parseInt(customQ);
            if (isNaN(q) || q < 1 || q > 100) {
                console.log("\n[!] 1에서 100 사이의 올바른 숫자를 입력해 주세요.\n");
            } else {
                const files = fs.readdirSync(inputDir);
                await processBatch(files, q, `직접설정`);
            }
        } else {
            console.log("\n[!] 잘못된 선택입니다. 다시 입력해 주세요.\n");
        }
        
        await rl.question("엔터 키를 눌러 메뉴로 돌아갑니다...");
        console.clear();
    }

    rl.close();
}

/**
 * 인자 기반 즉시 실행
 */
async function runWithArgs(arg) {
    let q = 80;
    let label = "기본값";

    if (arg === "ultra") { q = 96; label = "최상"; }
    else if (arg === "high") { q = 90; label = "상"; }
    else if (arg === "mid") { q = 80; label = "중"; }
    else if (arg === "low") { q = 70; label = "하"; }
    else if (!isNaN(arg)) { q = parseInt(arg); label = "인자입력"; }

    const files = fs.readdirSync(inputDir);
    await processBatch(files, q, label);
}

// 초기화 및 시작
ensureDirs();
const arg = process.argv[2];

if (arg) {
    runWithArgs(arg);
} else {
    showMenu();
}
