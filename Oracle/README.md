# Oracle
Operating off of OCI2, view at https://eggonomics.net

Implementation notes
- Create RediSearch index
  - `FT.CREATE index:submissions PREFIX 1 sub: SCHEMA ind TAG CASESENSITIVE`
- Initial stock price
  - `HSET stock-price Alpha 34.06 Bravo 46.62 Charlie 77.25 Delta 33.85
    Echo 5.15 Foxtrot 7.36 Golf 67.87 Hotel 18.84 India 35.68 Juliett 54.82
    Kilo 61.83 Lima 35.08 Mike 80.12 November 51.12 One 270.98 Oscar 64.02
    Papa 50.14 Quebec 32.88 Romeo 80.81 Sierra 94.28 Tango 15.41 Uniform 14.56
    Victor 26.12 Whiskey 10.66 X-ray 38.68 Yankee 8.73 Zero 19.67 Zulu 41.89`
- Constants
  - `HSET constants calc-range 4 keep-range 5 ind-win-mult 2 ind-lose-mult 1.9
    win-mult 4 lose-mult 3.8 stock-price-floor 5.0`
- Variables
  - `HSET variables gaffe-counter 0`
