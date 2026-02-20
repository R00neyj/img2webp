import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 루트 경로 설정 (src 폴더의 상위 폴더)
const rootDir = path.resolve(__dirname, "..");
const inputDir = path.join(rootDir, "input");
const outputDir = path.join(rootDir, "output");

// 폴더가 없으면 생성
if (!fs.existsSync(inputDir)) {
    fs.mkdirSync(inputDir);
    console.log("input 폴더가 없어 생성했습니다 이미지를 넣고 다시 실행해 주세요");
    process.exit(0);
}
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

// 퀄리티 설정 (기본값: 중)
const qualityMap = {
    high: 90,
    mid: 80,
    low: 70,
};

const selectedQuality = process.argv[2] || "mid";
const quality = qualityMap[selectedQuality] || 75;

const supportedExtensions = [".jpg", ".jpeg", ".png", ".tiff", ".gif", ".bmp"];

async function convertImages() {
    try {
        const files = fs.readdirSync(inputDir);
        const imageFiles = files.filter((file) => supportedExtensions.includes(path.extname(file).toLowerCase()));

        if (imageFiles.length === 0) {
            console.log("변환할 이미지가 input 폴더에 없습니다");
            return;
        }

        console.log(`설정 품질: ${selectedQuality.toUpperCase()} (${quality}%)`);
        console.log(`${imageFiles.length}개의 이미지 변환을 시작합니다...`);

        for (const file of imageFiles) {
            const inputPath = path.join(inputDir, file);
            const outputName = path.parse(file).name + ".webp";
            const outputPath = path.join(outputDir, outputName);

            await sharp(inputPath)
                .webp({
                    quality: quality,
                    effort: 4,
                    lossless: false,
                })
                .toFile(outputPath);

            console.log(`OK: ${file} -> ${outputName}`);
        }

        console.log("\n모든 이미지 변환 작업을 완료했습니다!");
    } catch (error) {
        console.error("\n오류가 발생했습니다:", error);
    }
}

convertImages();
