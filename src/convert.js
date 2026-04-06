import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";
import readline from "readline";
import readlinePromises from "readline/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, "..");
const inputDir = path.join(rootDir, "input");
const outputDir = path.join(rootDir, "output");

function ensureDirs() {
    if (!fs.existsSync(inputDir)) fs.mkdirSync(inputDir, { recursive: true });
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function getTotalInputSize() {
    const supportedExtensions = [".jpg", ".jpeg", ".png", ".tiff", ".gif", ".bmp"];
    const statsMap = { png: 0, jpg: 0, etc: 0, total: 0 };

    if (!fs.existsSync(inputDir)) return statsMap;

    const files = fs.readdirSync(inputDir);
    files.forEach((file) => {
        const ext = path.extname(file).toLowerCase();
        if (supportedExtensions.includes(ext)) {
            const size = fs.statSync(path.join(inputDir, file)).size;
            statsMap.total += size;
            if (ext === ".png") statsMap.png += size;
            else if (ext === ".jpg" || ext === ".jpeg") statsMap.jpg += size;
            else statsMap.etc += size;
        }
    });
    return statsMap;
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

    const finalQuality = Math.min(Math.max(parseInt(quality) || 90, 1), 100);
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
    const menuItems = [
        { label: "퀄리티: 최상 (100%)", value: 100, name: "최상" },
        { label: "퀄리티: 상   (96%)", value: 96, name: "상" },
        { label: "퀄리티: 중   (90%) - 추천", value: 90, name: "중" },
        { label: "퀄리티: 하   (80%)", value: 80, name: "하" },
        { label: "직접 입력 (1~100)", value: "custom" },
        { label: "종료", value: "exit" },
    ];

    let selectedIndex = 2; // 기본값: 중 (90%)
    const stats = getTotalInputSize();
    
    // 실제 압축률 측정을 위한 캘리브레이션
    const factors = { 100: 0.6, 96: 0.45, 90: 0.35, 80: 0.25 }; // 기본값
    
    if (stats.total > 0) {
        const supportedExtensions = [".jpg", ".jpeg", ".png", ".tiff", ".gif", ".bmp"];
        const files = fs.readdirSync(inputDir);
        const sampleFile = files.find(f => supportedExtensions.includes(path.extname(f).toLowerCase()));
        
        if (sampleFile) {
            const inputPath = path.join(inputDir, sampleFile);
            const inputSize = fs.statSync(inputPath).size;
            
            for (const q of [100, 96, 90, 80]) {
                try {
                    const buffer = await sharp(inputPath).webp({ quality: q, effort: 4 }).toBuffer();
                    factors[q] = buffer.length / inputSize;
                } catch (e) {
                    // 실패 시 기본값 유지
                }
            }
        }
    }

    // 키프레스 이벤트 초기화 (한 번만 실행하면 됨)
    readline.emitKeypressEvents(process.stdin);

    while (true) {
        const renderMenu = () => {
            console.clear();
            console.log("============================================");
            console.log("  img2webp - 이미지 일괄 변환 (방향키로 선택)");
            console.log("============================================");
            console.log("");

            menuItems.forEach((item, index) => {
                const prefix = index === selectedIndex ? " > " : "   ";
                const line = `${prefix}${item.label}`;
                if (index === selectedIndex) {
                    console.log(`\x1b[36m${line}\x1b[0m`);
                } else {
                    console.log(line);
                }
            });

            console.log("");
            console.log("============================================");
            
            const selectedItem = menuItems[selectedIndex];
            if (typeof selectedItem.value === "number" && stats.total > 0) {
                const currentFactor = factors[selectedItem.value] || 0.5;
                const estSize = stats.total * currentFactor;
                const diffPercent = Math.round((1 - currentFactor) * 100);
                
                if (diffPercent >= 0) {
                    console.log(` [계산] ${formatBytes(stats.total)} -> \x1b[32m${formatBytes(estSize)}\x1b[0m (\x1b[32m약 ${diffPercent}% 절약\x1b[0m)`);
                } else {
                    console.log(` [계산] ${formatBytes(stats.total)} -> \x1b[31m${formatBytes(estSize)}\x1b[0m (\x1b[31m약 ${Math.abs(diffPercent)}% 용량 증가\x1b[0m)`);
                }
            } else if (stats.total === 0) {
                console.log(" [!] input 폴더가 비어 있습니다.");
            } else {
                console.log(""); // 공백 유지
            }

            console.log("============================================");
            console.log(" (↑/↓: 이동, Enter: 선택, Ctrl+C: 종료)");
        };

        if (process.stdin.isTTY) process.stdin.setRawMode(true);
        renderMenu();

        const selected = await new Promise((resolve) => {
            const onKeypress = (str, key) => {
                if (key.ctrl && key.name === "c") {
                    process.exit();
                }

                if (key.name === "up") {
                    selectedIndex = (selectedIndex - 1 + menuItems.length) % menuItems.length;
                    renderMenu();
                } else if (key.name === "down") {
                    selectedIndex = (selectedIndex + 1) % menuItems.length;
                    renderMenu();
                } else if (key.name === "return") {
                    process.stdin.removeListener("keypress", onKeypress);
                    if (process.stdin.isTTY) process.stdin.setRawMode(false);
                    resolve(menuItems[selectedIndex]);
                }
            };
            process.stdin.on("keypress", onKeypress);
        });

        if (selected.value === "exit") {
            console.log("\n프로그램을 종료합니다.");
            process.exit(0);
        }

        if (selected.value === "custom") {
            const rl = readlinePromises.createInterface({
                input: process.stdin,
                output: process.stdout,
            });
            const customQ = await rl.question("\n원하는 퀄리티 숫자를 입력하세요 (1-100): ");
            const q = parseInt(customQ);
            rl.close();

            if (isNaN(q) || q < 1 || q > 100) {
                console.log("\n[!] 1에서 100 사이의 올바른 숫자를 입력해 주세요.\n");
            } else {
                const files = fs.readdirSync(inputDir);
                await processBatch(files, q, "직접설정");
            }
        } else {
            const files = fs.readdirSync(inputDir);
            await processBatch(files, selected.value, selected.name);
        }

        const rlFinal = readlinePromises.createInterface({
            input: process.stdin,
            output: process.stdout,
        });
        await rlFinal.question("엔터 키를 눌러 종료합니다...");
        rlFinal.close();
        process.exit(0);
    }
}

/**
 * 인자 기반 즉시 실행
 */
async function runWithArgs(arg) {
    let q = 90;
    let label = "기본값";

    if (arg === "ultra") { q = 100; label = "최상"; }
    else if (arg === "high") { q = 96; label = "상"; }
    else if (arg === "mid") { q = 90; label = "중"; }
    else if (arg === "low") { q = 80; label = "하"; }
    else if (!isNaN(arg)) { q = parseInt(arg); label = "인자입력"; }

    const files = fs.readdirSync(inputDir);
    await processBatch(files, q, label);
}

// 초기화 및 시작
ensureDirs();
const arg = process.argv[2];

if (arg) {
    await runWithArgs(arg);
} else {
    await showMenu();
}
