const fs = require('fs');

const toolUpdates = {
  // === RADIO (12) ===
  "airspyhf": {
    descriptionRu: "Хост-код для SDR-приёмника AirspyHF+",
    parameters: [
      { flag: "-f <freq>", description: "Частота приёма (Гц)" },
      { flag: "-s <rate>", description: "Частота дискретизации" },
      { flag: "-o <file>", description: "Выходной файл" }
    ],
    usageExamples: [
      { title: "Приём на частоте", command: "airspyhf_rx -f 100000000 -s 768000 -o signal.raw", description: "Приём сигнала на 100 МГц" }
    ]
  },
  "deskhpsdr": {
    descriptionRu: "SDR-приложение для протокола HPSDR и Soapy-API",
    parameters: [
      { flag: "--device <name>", description: "SDR-устройство" },
      { flag: "--freq <hz>", description: "Начальная частота" }
    ],
    usageExamples: [
      { title: "Запуск deskHPSDR", command: "deskhpsdr", description: "Запуск SDR-приложения deskHPSDR" }
    ]
  },
  "gr-air-modes": {
    descriptionRu: "Gnuradio-инструменты для приёма сигналов Mode S (ADS-B)",
    parameters: [
      { flag: "-s <source>", description: "Источник (rtl/uhd/file)" },
      { flag: "-r <rate>", description: "Частота дискретизации" },
      { flag: "-K <file>", description: "Вывод в KML-файл" }
    ],
    usageExamples: [
      { title: "ADS-B приём", command: "modes_rx -s rtl -r 2e6", description: "Приём ADS-B сигналов через RTL-SDR" },
      { title: "С KML", command: "modes_rx -s rtl -K flights.kml", description: "Отслеживание самолётов с KML-экспортом" }
    ]
  },
  "gr-dect2": {
    descriptionRu: "Декодирование голосовых каналов DECT в реальном времени через Gnuradio",
    parameters: [
      { flag: "-f <freq>", description: "Частота DECT" },
      { flag: "-s <source>", description: "Источник SDR" }
    ],
    usageExamples: [
      { title: "DECT-декодирование", command: "gr-dect2 -f 1880e6 -s rtl", description: "Декодирование DECT-голоса в реальном времени" }
    ]
  },
  "libosmocore": {
    descriptionRu: "Коллекция общего кода проектов Osmocom (GSM/телеком)",
    parameters: [
      { flag: "--help", description: "Показать справку" }
    ],
    usageExamples: [
      { title: "Библиотека Osmocom", command: "osmo-config-merge config1 config2", description: "Слияние конфигурационных файлов Osmocom" }
    ]
  },
  "qradiolink": {
    descriptionRu: "Мультирежимный SDR-трансивер для GNU Radio, ADALM-Pluto, LimeSDR, USRP",
    parameters: [
      { flag: "--device <name>", description: "SDR-устройство" },
      { flag: "--freq <hz>", description: "Частота" },
      { flag: "--mode <mode>", description: "Режим (FM/AM/SSB/digital)" }
    ],
    usageExamples: [
      { title: "FM-приём", command: "qradiolink --mode FM --freq 100e6", description: "Приём FM-радио на 100 МГц" }
    ]
  },
  "rfcat": {
    descriptionRu: "Швейцарский нож для ISM-диапазонного радио",
    parameters: [
      { flag: "-r", description: "Интерактивный режим" },
      { flag: "-f <freq>", description: "Частота" },
      { flag: "-M <mod>", description: "Модуляция (MOD_ASK/MOD_FSK)" }
    ],
    usageExamples: [
      { title: "Интерактивный режим", command: "rfcat -r", description: "Запуск rfcat в интерактивном режиме" },
      { title: "Установка частоты", command: "rfcat -f 433920000", description: "Работа на частоте 433.92 МГц" }
    ]
  },
  "sdrangel": {
    descriptionRu: "Qt6/OpenGL SDR и анализатор сигналов",
    parameters: [
      { flag: "--device <name>", description: "SDR-устройство" },
      { flag: "--freq <hz>", description: "Начальная частота" },
      { flag: "--headless", description: "Безголовый режим" }
    ],
    usageExamples: [
      { title: "Запуск SDRangel", command: "sdrangel", description: "Запуск SDRangel с GUI" },
      { title: "Без GUI", command: "sdrangel --headless", description: "Запуск в безголовом режиме" }
    ]
  },
  "sdrpp": {
    descriptionRu: "Лёгкий SDR-приёмник без лишнего",
    parameters: [
      { flag: "--device <name>", description: "SDR-устройство" }
    ],
    usageExamples: [
      { title: "Запуск SDR++", command: "sdrpp", description: "Запуск SDR++ приёмника" }
    ]
  },
  "sdrsharp": {
    descriptionRu: "Самая популярная программа для SDR",
    parameters: [
      { flag: "--device <name>", description: "SDR-устройство" }
    ],
    usageExamples: [
      { title: "Запуск SDR#", command: "sdrsharp", description: "Запуск SDR# приёмника" }
    ]
  },
  "sdrtrunk": {
    descriptionRu: "Кроссплатформенное Java-приложение для декодирования транкинговых протоколов через SDR",
    parameters: [
      { flag: "--device <name>", description: "SDR-устройство" },
      { flag: "--system <file>", description: "Файл конфигурации системы" }
    ],
    usageExamples: [
      { title: "Запуск SDRTrunk", command: "sdrtrunk", description: "Запуск декодера транкинговых протоколов" }
    ]
  },
  "yate-bts": {
    descriptionRu: "Открытое ПО GSM-базовой станции",
    parameters: [
      { flag: "-c <config>", description: "Файл конфигурации" },
      { flag: "-d", description: "Режим демона" },
      { flag: "-v", description: "Подробный вывод" }
    ],
    usageExamples: [
      { title: "Запуск BTS", command: "yate-bts -c /etc/yate/yatebts.conf -d", description: "Запуск GSM-базовой станции" }
    ]
  },

  // === AUTOMATION (7) ===
  "mentalist": {
    descriptionRu: "Графический инструмент для создания пользовательских словарей",
    parameters: [
      { flag: "--gui", description: "Запуск GUI" }
    ],
    usageExamples: [
      { title: "Генератор словарей", command: "mentalist", description: "Запуск GUI-генератора словарей" }
    ]
  },
  "penbox": {
    descriptionRu: "Фреймворк пентестинга — набор всех инструментов",
    parameters: [
      { flag: "-m <module>", description: "Модуль для запуска" },
      { flag: "--list", description: "Список модулей" }
    ],
    usageExamples: [
      { title: "Запуск PenBox", command: "penbox", description: "Запуск фреймворка PenBox" },
      { title: "Список модулей", command: "penbox --list", description: "Показать доступные модули" }
    ]
  },
  "pentmenu": {
    descriptionRu: "Bash-скрипт для разведки и DoS-атак",
    parameters: [
      { flag: "-t <target>", description: "Целевой хост" }
    ],
    usageExamples: [
      { title: "Запуск PentMenu", command: "pentmenu", description: "Запуск интерактивного меню пентестинга" }
    ]
  },
  "pureblood": {
    descriptionRu: "Фреймворк пентестинга для хакеров и багхантеров",
    parameters: [
      { flag: "-m <module>", description: "Модуль" },
      { flag: "-t <target>", description: "Цель" }
    ],
    usageExamples: [
      { title: "Запуск PureBlood", command: "pureblood", description: "Запуск фреймворка PureBlood" }
    ]
  },
  "scap-workbench": {
    descriptionRu: "Графический интерфейс SCAP-сканера для валидации политик безопасности",
    parameters: [
      { flag: "--gui", description: "Запуск GUI" },
      { flag: "-f <file>", description: "Файл SCAP-контента" }
    ],
    usageExamples: [
      { title: "SCAP-аудит", command: "scap-workbench", description: "Запуск SCAP Workbench GUI" }
    ]
  },
  "thefatrat": {
    descriptionRu: "Массивный инструмент эксплуатации — генератор бэкдоров и пост-эксплуатация",
    parameters: [
      { flag: "-m <module>", description: "Модуль генерации" },
      { flag: "-p <payload>", description: "Тип полезной нагрузки" },
      { flag: "-l <host>", description: "LHOST для обратного подключения" }
    ],
    usageExamples: [
      { title: "Запуск TheFatRat", command: "fatrat", description: "Запуск TheFatRat в интерактивном режиме" }
    ]
  },
  "wmd": {
    descriptionRu: "Python-фреймворк для инструментов ИБ",
    parameters: [
      { flag: "-m <module>", description: "Модуль для запуска" },
      { flag: "--list", description: "Список модулей" }
    ],
    usageExamples: [
      { title: "Запуск WMD", command: "wmd", description: "Запуск фреймворка WMD" },
      { title: "Список модулей", command: "wmd --list", description: "Показать доступные модули" }
    ]
  },

  // === DATABASE (5) ===
  "blindsql": {
    descriptionRu: "Набор bash-скриптов для слепых SQL-инъекций",
    parameters: [
      { flag: "-u <url>", description: "Целевой URL с параметром" },
      { flag: "-p <param>", description: "Уязвимый параметр" },
      { flag: "-d <dbms>", description: "СУБД (mysql/mssql)" }
    ],
    usageExamples: [
      { title: "Слепая SQL-инъекция", command: "blindsql -u 'http://target.com/page?id=1' -p id -d mysql", description: "Слепая SQL-инъекция через параметр id" }
    ]
  },
  "getsids": {
    descriptionRu: "Перечисление Oracle SID через команду services к TNS-листенеру",
    parameters: [
      { flag: "-t <target>", description: "IP Oracle-сервера" },
      { flag: "-p <port>", description: "Порт TNS (по умолчанию 1521)" }
    ],
    usageExamples: [
      { title: "Перечисление SID", command: "getsids -t 192.168.1.1 -p 1521", description: "Перечисление Oracle SID через TNS" }
    ]
  },
  "metacoretex": {
    descriptionRu: "Java-фреймворк сканирования уязвимостей баз данных",
    parameters: [
      { flag: "-t <target>", description: "Целевой сервер БД" },
      { flag: "-d <dbms>", description: "Тип СУБД" },
      { flag: "-m <module>", description: "Модуль сканирования" }
    ],
    usageExamples: [
      { title: "Скан БД", command: "metacoretex -t 192.168.1.1 -d oracle -m vuln", description: "Сканирование Oracle на уязвимости" }
    ]
  },
  "mysql2sqlite": {
    descriptionRu: "Конвертация дампа MySQL в формат SQLite 3",
    parameters: [
      { flag: "<input>", description: "Файл дампа MySQL" },
      { flag: "-o <file>", description: "Выходной файл SQLite" }
    ],
    usageExamples: [
      { title: "MySQL → SQLite", command: "mysql2sqlite dump.sql -o database.sqlite", description: "Конвертация MySQL-дампа в SQLite" }
    ]
  },
  "pgdbf": {
    descriptionRu: "Конвертация баз данных XBase/FoxPro в PostgreSQL",
    parameters: [
      { flag: "<file>", description: "DBF-файл" },
      { flag: "-t <table>", description: "Имя таблицы PostgreSQL" }
    ],
    usageExamples: [
      { title: "DBF → PostgreSQL", command: "pgdbf data.dbf -t mytable | psql mydb", description: "Импорт DBF-файла в PostgreSQL" }
    ]
  },

  // === HARDWARE (5) ===
  "buspirate": {
    descriptionRu: "Инструменты для аппаратного хакинга устройством Bus Pirate",
    parameters: [
      { flag: "-p <port>", description: "Последовательный порт" },
      { flag: "-m <mode>", description: "Режим (SPI/I2C/UART)" },
      { flag: "-s <speed>", description: "Скорость передачи" }
    ],
    usageExamples: [
      { title: "Bus Pirate SPI", command: "buspirate -p /dev/ttyUSB0 -m SPI", description: "Подключение к Bus Pirate в режиме SPI" }
    ]
  },
  "dex2jar": {
    descriptionRu: "Конвертация Android .dex в Java .class формат",
    parameters: [
      { flag: "<file>", description: "DEX или APK-файл" },
      { flag: "-o <file>", description: "Выходной JAR-файл" }
    ],
    usageExamples: [
      { title: "DEX → JAR", command: "d2j-dex2jar app.apk -o classes.jar", description: "Конвертация APK в JAR для декомпиляции" }
    ]
  },
  "hdmi-sniff": {
    descriptionRu: "Инструмент инспекции HDMI DDC (I2C) для извлечения HDCP-ключей",
    parameters: [
      { flag: "-d <device>", description: "I2C-устройство" },
      { flag: "-o <file>", description: "Файл для ключей" }
    ],
    usageExamples: [
      { title: "HDMI-сниффинг", command: "hdmi-sniff -d /dev/i2c-0 -o keys.bin", description: "Извлечение HDCP-ключей из HDMI" }
    ]
  },
  "kautilya": {
    descriptionRu: "Pwnage через HID-устройства Teensy++2.0 и Teensy 3.0",
    parameters: [
      { flag: "-p <payload>", description: "Полезная нагрузка" },
      { flag: "-o <file>", description: "Выходной файл для Teensy" },
      { flag: "-t <target>", description: "Целевая ОС (win/linux/osx)" }
    ],
    usageExamples: [
      { title: "HID-атака", command: "kautilya -p reverse_shell -t win -o payload.ino", description: "Генерация HID-пейлоада для Windows" }
    ]
  },
  "pcileech": {
    descriptionRu: "Чтение и запись системной памяти через PCIe-устройства",
    parameters: [
      { flag: "-device <dev>", description: "PCIe-устройство (fpga/usb3380)" },
      { flag: "-kmd <module>", description: "Модуль ядра" },
      { flag: "-min <addr>", description: "Начальный адрес" },
      { flag: "-max <addr>", description: "Конечный адрес" }
    ],
    usageExamples: [
      { title: "Дамп памяти", command: "pcileech -device fpga -min 0 -max 0x10000000 dump", description: "Дамп первых 256 МБ системной памяти через FPGA" }
    ]
  },

  // === DEFENSIVE (5) ===
  "persistencesniper": {
    descriptionRu: "Охотник за закладками (persistence) на Windows-машинах",
    parameters: [
      { flag: "--scan", description: "Сканирование системы" },
      { flag: "-o <file>", description: "Файл отчёта" },
      { flag: "-v", description: "Подробный вывод" }
    ],
    usageExamples: [
      { title: "Поиск закладок", command: "persistencesniper --scan -o report.csv", description: "Сканирование Windows на закладки" }
    ]
  },
  "sooty": {
    descriptionRu: "CLI-инструмент SOC-аналитика для автоматизации рабочего процесса",
    parameters: [
      { flag: "-m <module>", description: "Модуль (url/email/hash/ip)" },
      { flag: "-i <input>", description: "Входные данные для анализа" }
    ],
    usageExamples: [
      { title: "Анализ URL", command: "sooty -m url -i http://suspicious.com", description: "Анализ подозрительного URL" },
      { title: "Проверка хеша", command: "sooty -m hash -i SHA256HASH", description: "Проверка файлового хеша" }
    ]
  },
  "threatdragon": {
    descriptionRu: "Инструмент моделирования угроз от OWASP",
    parameters: [
      { flag: "--gui", description: "Запуск веб-интерфейса" },
      { flag: "-p <port>", description: "Порт веб-сервера" }
    ],
    usageExamples: [
      { title: "Threat Dragon", command: "threatdragon --gui -p 3000", description: "Запуск Threat Dragon на порту 3000" }
    ]
  },
  "tor-browser": {
    descriptionRu: "Tor Browser Bundle — анонимный просмотр через Firefox и Tor",
    parameters: [
      { flag: "--detach", description: "Запуск в фоне" }
    ],
    usageExamples: [
      { title: "Запуск Tor Browser", command: "tor-browser", description: "Запуск анонимного браузера Tor" }
    ]
  },
  "tyton": {
    descriptionRu: "Охотник за руткитами уровня ядра",
    parameters: [
      { flag: "--scan", description: "Сканирование системы" },
      { flag: "-v", description: "Подробный вывод" }
    ],
    usageExamples: [
      { title: "Поиск руткитов", command: "tyton --scan -v", description: "Сканирование на руткиты ядра" }
    ]
  },

  // === WORDLIST (4) ===
  "assetnote-wordlists": {
    descriptionRu: "Словари сгенерированные Assetnote для сканирования веб-приложений",
    parameters: [
      { flag: "<wordlist>", description: "Имя словаря" }
    ],
    usageExamples: [
      { title: "Использование словаря", command: "ffuf -w /usr/share/assetnote-wordlists/httparchive_directories.txt -u http://target/FUZZ", description: "Фаззинг каталогов со словарём Assetnote" }
    ]
  },
  "country-ip-blocks": {
    descriptionRu: "CIDR-данные IP-адресов по странам от региональных регистратур",
    parameters: [
      { flag: "<country>", description: "Код страны (RU/US/CN и т.д.)" }
    ],
    usageExamples: [
      { title: "IP-блоки страны", command: "cat /usr/share/country-ip-blocks/RU.cidr", description: "Просмотр IP-блоков России" }
    ]
  },
  "ldapwordlistharvester": {
    descriptionRu: "Генерация словарей из информации LDAP для подбора паролей домена",
    parameters: [
      { flag: "-d <domain>", description: "Домен LDAP" },
      { flag: "-u <user>", description: "Имя пользователя LDAP" },
      { flag: "-p <pass>", description: "Пароль LDAP" },
      { flag: "-o <file>", description: "Выходной файл словаря" }
    ],
    usageExamples: [
      { title: "LDAP-словарь", command: "ldapwordlistharvester -d corp.local -u admin -p password -o wordlist.txt", description: "Генерация словаря из LDAP-каталога" }
    ]
  },
  "wdict": {
    descriptionRu: "Создание словарей путём скрейпинга веб-страниц или локальных файлов",
    parameters: [
      { flag: "-u <url>", description: "URL для скрейпинга" },
      { flag: "-f <file>", description: "Локальный файл" },
      { flag: "-o <file>", description: "Выходной словарь" },
      { flag: "-d <depth>", description: "Глубина скрейпинга" }
    ],
    usageExamples: [
      { title: "Словарь из сайта", command: "wdict -u http://target.com -o wordlist.txt -d 3", description: "Создание словаря из контента сайта" }
    ]
  },

  // === FIRMWARE (3, buspirate уже выше) ===
  "firmware-mod-kit": {
    descriptionRu: "Модификация образов прошивок без перекомпиляции",
    parameters: [
      { flag: "extract <file>", description: "Распаковать прошивку" },
      { flag: "build <dir>", description: "Пересобрать прошивку" }
    ],
    usageExamples: [
      { title: "Распаковка прошивки", command: "extract-firmware firmware.bin", description: "Распаковка образа прошивки" },
      { title: "Пересборка", command: "build-firmware firmware_dir/", description: "Пересборка модифицированной прошивки" }
    ]
  },
  "meanalyzer": {
    descriptionRu: "Инструмент анализа прошивки Intel Management Engine",
    parameters: [
      { flag: "<file>", description: "Файл прошивки ME" },
      { flag: "-d", description: "Подробный анализ" }
    ],
    usageExamples: [
      { title: "Анализ ME", command: "meanalyzer firmware.bin -d", description: "Подробный анализ Intel ME прошивки" }
    ]
  },
  "uefi-firmware-parser": {
    descriptionRu: "Парсер структур BIOS/Intel ME/UEFI — тома, файловые системы, файлы",
    parameters: [
      { flag: "<file>", description: "Файл прошивки UEFI" },
      { flag: "-e", description: "Извлечение содержимого" },
      { flag: "-o <dir>", description: "Каталог для извлечения" }
    ],
    usageExamples: [
      { title: "Парсинг UEFI", command: "uefi-firmware-parser firmware.rom -e -o extracted/", description: "Извлечение содержимого UEFI-прошивки" }
    ]
  },

  // === DRONE (4) ===
  "crozono": {
    descriptionRu: "Модульный фреймворк для пентестинга беспроводных сетей с дронов",
    parameters: [
      { flag: "-m <module>", description: "Модуль атаки" },
      { flag: "-i <interface>", description: "WiFi-интерфейс" },
      { flag: "-t <target>", description: "Цель" }
    ],
    usageExamples: [
      { title: "Пентест с дрона", command: "crozono -m deauth -i wlan0 -t AA:BB:CC:DD:EE:FF", description: "Деаутентификация с дрона" }
    ]
  },
  "missionplanner": {
    descriptionRu: "Наземная станция управления для ArduPilot",
    parameters: [
      { flag: "--gui", description: "Запуск GUI" },
      { flag: "--connect <port>", description: "Подключение к дрону" }
    ],
    usageExamples: [
      { title: "Запуск MissionPlanner", command: "missionplanner", description: "Запуск наземной станции управления" }
    ]
  },
  "skyjack": {
    descriptionRu: "Перехват управления дронами Parrot через деаутентификацию владельца",
    parameters: [
      { flag: "-i <interface>", description: "WiFi-интерфейс" },
      { flag: "-t <target>", description: "MAC-адрес дрона" }
    ],
    usageExamples: [
      { title: "Перехват дрона", command: "skyjack -i wlan0mon", description: "Поиск и перехват управления дронами Parrot" }
    ]
  },
  "snoopy-ng": {
    descriptionRu: "Распределённый фреймворк сбора, перехвата и анализа данных с сенсоров",
    parameters: [
      { flag: "-m <module>", description: "Модуль сенсора" },
      { flag: "-i <interface>", description: "Интерфейс" },
      { flag: "--server", description: "Режим сервера" }
    ],
    usageExamples: [
      { title: "Сбор данных", command: "snoopy-ng -m wifi -i wlan0", description: "Запуск WiFi-сенсора для сбора данных" }
    ]
  },

  // === MISC (4) ===
  "leo": {
    descriptionRu: "Редактор для литературного программирования, outliner и менеджер проектов",
    parameters: [
      { flag: "<file>", description: "Файл проекта Leo" },
      { flag: "--gui", description: "Запуск GUI" }
    ],
    usageExamples: [
      { title: "Запуск Leo", command: "leo", description: "Запуск редактора Leo" }
    ]
  },
  "python2-darts-util-lru": {
    descriptionRu: "Простой словарь с поведением LRU для Python 2",
    parameters: [
      { flag: "<script>", description: "Python-скрипт" }
    ],
    usageExamples: [
      { title: "Использование LRU", command: "python2 -c 'from darts.lib.utils.lru import LRUDict; d=LRUDict(10)'", description: "Создание LRU-словаря" }
    ]
  },
  "sasm": {
    descriptionRu: "Простая кроссплатформенная IDE для NASM, MASM, GAS и FASM",
    parameters: [
      { flag: "<file>", description: "Файл с исходным кодом" },
      { flag: "--gui", description: "Запуск GUI" }
    ],
    usageExamples: [
      { title: "Запуск SASM", command: "sasm", description: "Запуск IDE для ассемблера" }
    ]
  },
  "verinice": {
    descriptionRu: "Инструмент управления информационной безопасностью",
    parameters: [
      { flag: "--gui", description: "Запуск GUI" }
    ],
    usageExamples: [
      { title: "Запуск Verinice", command: "verinice", description: "Запуск инструмента управления ИБ" }
    ]
  },

  // === NETWORKING (3, responder-advanced уже обработан) ===
  "libtins": {
    descriptionRu: "Высокоуровневая C++ библиотека для перехвата и создания сетевых пакетов",
    parameters: [
      { flag: "<script>", description: "Программа, использующая libtins" }
    ],
    usageExamples: [
      { title: "Использование libtins", command: "g++ -o sniffer sniffer.cpp -ltins && ./sniffer", description: "Компиляция и запуск сниффера на libtins" }
    ]
  },
  "umit": {
    descriptionRu: "Мощный фронтенд для Nmap с графическим интерфейсом",
    parameters: [
      { flag: "-t <target>", description: "Целевой хост" },
      { flag: "--gui", description: "Запуск GUI" }
    ],
    usageExamples: [
      { title: "Запуск Umit", command: "umit --gui", description: "Запуск графического фронтенда Nmap" }
    ]
  },
  "xerosploit": {
    descriptionRu: "Эффективный и продвинутый MITM-фреймворк",
    parameters: [
      { flag: "-i <interface>", description: "Сетевой интерфейс" },
      { flag: "-t <target>", description: "Целевой IP" },
      { flag: "-m <module>", description: "Модуль атаки" }
    ],
    usageExamples: [
      { title: "MITM-атака", command: "xerosploit -i eth0 -t 192.168.1.100 -m sniff", description: "MITM с перехватом трафика" }
    ]
  },

  // === AI (3) ===
  "adversarial-robustness-toolbox": {
    descriptionRu: "Python-библиотека для безопасности машинного обучения",
    parameters: [
      { flag: "<script>", description: "Python-скрипт с ART" }
    ],
    usageExamples: [
      { title: "Adversarial атака", command: "python -c 'from art.attacks.evasion import FastGradientMethod'", description: "Использование ART для adversarial-атак" }
    ]
  },
  "cai": {
    descriptionRu: "Фреймворк безопасности искусственного интеллекта",
    parameters: [
      { flag: "-m <model>", description: "Целевая модель" },
      { flag: "-a <attack>", description: "Тип атаки" },
      { flag: "-d <dataset>", description: "Датасет" }
    ],
    usageExamples: [
      { title: "Атака на модель", command: "cai -m model.h5 -a evasion -d test_data/", description: "Атака уклонения на ML-модель" }
    ]
  },
  "cleverhans": {
    descriptionRu: "Python-библиотека для тестирования ML-систем на adversarial-примеры",
    parameters: [
      { flag: "<script>", description: "Python-скрипт с CleverHans" }
    ],
    usageExamples: [
      { title: "Adversarial тест", command: "python -c 'from cleverhans.tf2.attacks import fast_gradient_method'", description: "Тест модели на adversarial-устойчивость" }
    ]
  },

  // === AUTOMOBILE (3) ===
  "canalyzat0r": {
    descriptionRu: "Набор инструментов анализа безопасности проприетарных автомобильных протоколов",
    parameters: [
      { flag: "-i <interface>", description: "CAN-интерфейс" },
      { flag: "-m <module>", description: "Модуль (sniff/inject/fuzz)" },
      { flag: "--gui", description: "Запуск GUI" }
    ],
    usageExamples: [
      { title: "CAN-сниффинг", command: "canalyzat0r -i can0 -m sniff", description: "Перехват CAN-трафика автомобиля" },
      { title: "GUI-режим", command: "canalyzat0r --gui", description: "Запуск графического интерфейса" }
    ]
  },
  "cantoolz": {
    descriptionRu: "Фреймворк для black-box анализа CAN-сетей",
    parameters: [
      { flag: "-i <interface>", description: "CAN-интерфейс" },
      { flag: "-c <config>", description: "Файл конфигурации" },
      { flag: "-m <module>", description: "Модуль" }
    ],
    usageExamples: [
      { title: "CAN-анализ", command: "cantoolz -i can0 -c config.py", description: "Анализ CAN-шины автомобиля" }
    ]
  },
  "savvycan": {
    descriptionRu: "Qt-инструмент анализа CAN-шины автомобиля",
    parameters: [
      { flag: "--gui", description: "Запуск GUI" },
      { flag: "-i <interface>", description: "CAN-интерфейс" }
    ],
    usageExamples: [
      { title: "CAN-анализатор", command: "savvycan", description: "Запуск GUI-анализатора CAN-шины" }
    ]
  },

  // === CRYPTO (3) ===
  "hlextend": {
    descriptionRu: "Чистый Python-модуль для атак расширения длины хеша",
    parameters: [
      { flag: "<script>", description: "Python-скрипт с hlextend" }
    ],
    usageExamples: [
      { title: "Hash length extension", command: "python -c 'import hlextend; sha = hlextend.new(\"sha256\")'", description: "Атака расширения длины SHA-256" }
    ]
  },
  "pip3line": {
    descriptionRu: "Швейцарский нож манипуляции байтами — конвертация, кодирование, шифрование",
    parameters: [
      { flag: "--gui", description: "Запуск GUI" },
      { flag: "-i <file>", description: "Входной файл" },
      { flag: "-t <transform>", description: "Трансформация" }
    ],
    usageExamples: [
      { title: "Запуск Pip3line", command: "pip3line --gui", description: "Запуск GUI для манипуляции байтами" }
    ]
  },
  "zulucrypt": {
    descriptionRu: "Фронтенд для cryptsetup и tcplay — управление зашифрованными устройствами",
    parameters: [
      { flag: "-c <device>", description: "Создать зашифрованный том" },
      { flag: "-o <device>", description: "Открыть зашифрованный том" },
      { flag: "-p <pass>", description: "Пароль" },
      { flag: "--gui", description: "Запуск GUI" }
    ],
    usageExamples: [
      { title: "Открытие тома", command: "zulucrypt -o /dev/sdb1 -p password", description: "Открытие зашифрованного тома" },
      { title: "GUI-режим", command: "zuluCrypt-gui", description: "Запуск графического менеджера шифрования" }
    ]
  },

  // === FORENSIC (2) ===
  "mobiusft": {
    descriptionRu: "Форензик-фреймворк на Python/GTK для управления делами и расширениями",
    parameters: [
      { flag: "--gui", description: "Запуск GUI" },
      { flag: "-c <case>", description: "Открыть дело" }
    ],
    usageExamples: [
      { title: "Запуск MobiusFT", command: "mobiusft --gui", description: "Запуск форензик-фреймворка" }
    ]
  },
  "shadowexplorer": {
    descriptionRu: "Просмотрщик теневых копий Windows Volume Shadow Copy Service",
    parameters: [
      { flag: "--gui", description: "Запуск GUI" }
    ],
    usageExamples: [
      { title: "Просмотр теневых копий", command: "shadowexplorer", description: "Просмотр теневых копий Windows" }
    ]
  },

  // === REVERSING (2) ===
  "netzob": {
    descriptionRu: "Инструмент реверс-инжиниринга, генерации трафика и фаззинга протоколов",
    parameters: [
      { flag: "--gui", description: "Запуск GUI" },
      { flag: "-i <pcap>", description: "Импорт pcap-файла" }
    ],
    usageExamples: [
      { title: "Реверс протокола", command: "netzob --gui", description: "Запуск Netzob для реверса протоколов" },
      { title: "Импорт pcap", command: "netzob -i traffic.pcap", description: "Импорт pcap для анализа протокола" }
    ]
  },
  "radare2-keystone": {
    descriptionRu: "Плагин ассемблера Keystone для radare2",
    parameters: [
      { flag: "r2 -a <arch>", description: "Архитектура для ассемблирования" }
    ],
    usageExamples: [
      { title: "Keystone в r2", command: "r2 -e asm.assembler=keystone binary", description: "Использование Keystone-ассемблера в radare2" }
    ]
  },

  // === KEYLOGGER (2) ===
  "python-keylogger": {
    descriptionRu: "Простой кейлоггер на Python",
    parameters: [
      { flag: "-o <file>", description: "Файл для записи нажатий" },
      { flag: "-d", description: "Режим демона" }
    ],
    usageExamples: [
      { title: "Запуск кейлоггера", command: "python-keylogger -o /tmp/keys.log -d", description: "Запуск кейлоггера в фоновом режиме" }
    ]
  },
  "xspy": {
    descriptionRu: "Утилита мониторинга нажатий клавиш на удалённых X-серверах",
    parameters: [
      { flag: "<display>", description: "X-дисплей для мониторинга" }
    ],
    usageExamples: [
      { title: "X-кейлоггер", command: "xspy :0", description: "Мониторинг клавиатуры на X-дисплее :0" }
    ]
  },

  // === WIRELESS (2) ===
  "rtl8814au-dkms-git": {
    descriptionRu: "Драйвер чипсетов RTL8814AU и RTL8813AU с прошивкой v5.8.5.1",
    parameters: [
      { flag: "dkms install", description: "Установка DKMS-модуля" }
    ],
    usageExamples: [
      { title: "Установка драйвера", command: "dkms install rtl8814au/5.8.5.1", description: "Установка драйвера RTL8814AU" }
    ]
  },
  "wifi-pumpkin": {
    descriptionRu: "Фреймворк для атак через мошенническую Wi-Fi точку доступа",
    parameters: [
      { flag: "-i <interface>", description: "WiFi-интерфейс" },
      { flag: "--essid <name>", description: "Имя фейковой AP" },
      { flag: "-m <module>", description: "Модуль атаки" }
    ],
    usageExamples: [
      { title: "Rogue AP", command: "wifi-pumpkin -i wlan0 --essid 'FreeWiFi'", description: "Запуск фейковой точки доступа" },
      { title: "С модулем", command: "wifi-pumpkin -i wlan0 --essid 'FreeWiFi' -m dns_spoof", description: "Rogue AP с DNS-спуфингом" }
    ]
  },

  // === PACKER (2) ===
  "sherlocked": {
    descriptionRu: "Универсальный упаковщик скриптов — превращает скрипт в зашифрованный ELF",
    parameters: [
      { flag: "-i <file>", description: "Входной скрипт" },
      { flag: "-o <file>", description: "Выходной ELF" },
      { flag: "-p <password>", description: "Пароль шифрования" }
    ],
    usageExamples: [
      { title: "Упаковка скрипта", command: "sherlocked -i script.py -o packed.elf -p secret", description: "Упаковка Python-скрипта в зашифрованный ELF" }
    ]
  },
  "vbsmin": {
    descriptionRu: "Минификатор VBScript",
    parameters: [
      { flag: "<file>", description: "VBS-файл для минификации" },
      { flag: "-o <file>", description: "Выходной минифицированный файл" }
    ],
    usageExamples: [
      { title: "Минификация VBS", command: "vbsmin script.vbs -o script.min.vbs", description: "Минификация VBScript-файла" }
    ]
  },

  // === NFC (1) ===
  "nfcutils": {
    descriptionRu: "Утилита для перечисления NFC-тегов в поле устройства",
    parameters: [
      { flag: "-l", description: "Список NFC-тегов" },
      { flag: "-d <device>", description: "NFC-устройство" }
    ],
    usageExamples: [
      { title: "Список NFC-тегов", command: "nfcutils -l", description: "Перечисление NFC-тегов в поле устройства" }
    ]
  },

  // === CRACKER (1) ===
  "samydeluxe": {
    descriptionRu: "Скрипт автоматического создания дампа SAM для извлечения хешей",
    parameters: [
      { flag: "-o <file>", description: "Выходной файл дампа" }
    ],
    usageExamples: [
      { title: "SAM-дамп", command: "samydeluxe -o sam_dump.txt", description: "Автоматическое создание дампа SAM" }
    ]
  }
};

const toolsPath = 'data/tools.json';
const tools = JSON.parse(fs.readFileSync(toolsPath, 'utf8'));
let updated = 0;
let notFound = [];
for (const [id, update] of Object.entries(toolUpdates)) {
  const tool = tools.find(t => t.id === id);
  if (tool) {
    if (update.descriptionRu) tool.descriptionRu = update.descriptionRu;
    if (update.parameters) tool.parameters = update.parameters;
    if (update.usageExamples) tool.usageExamples = update.usageExamples;
    updated++;
  } else { notFound.push(id); }
}
fs.writeFileSync(toolsPath, JSON.stringify(tools, null, 2));
const withParams = tools.filter(t => t.parameters && t.parameters.length > 0).length;
const total = tools.length;
const pct = ((withParams / total) * 100).toFixed(1);
console.log(`Updated ${updated} tools (batch 65 - FINAL)`);
if (notFound.length) console.log(`Not found: ${notFound.join(', ')}`);
console.log(`Total tools with params: ${withParams}/${total} (${pct}%)`);
