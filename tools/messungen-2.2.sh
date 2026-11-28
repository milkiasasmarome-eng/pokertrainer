#!/bin/sh
# Abschließende Messungen 2.2 (Arbeitspakete 1, 2, 10). Rohdaten in tests/results/calib-2.2/ (Spot-Dateien) und Zusammenfassungen *.sum.json.
# Aufruf: sh tools/messungen-2.2.sh <Arbeitsbaum 2.1.0>
set -e
cd "$(dirname "$0")/.."
OLD=${1:-../wt-v210}; NEW=$(pwd); D=tests/results/calib-2.2; mkdir -p $D
par() { "$@" & }
# Range-Kalibrierung: Gegner-KI 2.2, Coach-Range 2.1.0 gegen 2.2 (gleiche Spots, gleiche Seeds)
for g in V:21:6000 T:31:4000 synth:41:4000 final:42:4000; do
  G=${g%%:*}; R=${g#*:}; S=${R%%:*}; H=${R#*:}
  par node tests/strategy/range-calib.js $S $H $G $D/rc_${G}_210.json $OLD
  node tests/strategy/range-calib.js $S $H $G $D/rc_${G}_22.json $NEW; wait
done
par node tests/strategy/range-calib.js 51 40000 V $D/lead_V_210.json $OLD x lead
node tests/strategy/range-calib.js 51 40000 V $D/lead_V_22.json $NEW x lead; wait
# Equity-Kalibrierung mit dem Coach als Held (an.equity.eq)
for g in V:12:3000 T:13:3000; do G=${g%%:*}; R=${g#*:}; S=${R%%:*}; H=${R#*:}
  par node tests/strategy/equity-calib.js $S $H $G $D/ec_${G}_210.json $OLD
  node tests/strategy/equity-calib.js $S $H $G $D/ec_${G}_22.json $NEW; wait
done
for f in $D/rc_*.json $D/lead_*.json $D/ec_*.json; do case $f in *.sum.json) ;; *) node tests/strategy/calib-report.js $f --json ${f%.json}.sum.json > /dev/null;; esac; done
# Reaktionsmodell: Gruppen V und T, Reaktionsmodell 2.2 (Mischmodell) gegen 2.1 (Populations-/MDF-Modell) im selben Coach
rm -f tests/results/sizing-study/fin22-* tests/results/sizing-study/fin21r-*
par env PT_GROUP=V node tests/strategy/sizing-study.js $NEW 641 1500 bots fin22V
PT_GROUP=V node tests/strategy/sizing-study.js $NEW 641 1500 bots v22altV; wait
par env PT_GROUP=T node tests/strategy/sizing-study.js $NEW 651 1500 bots fin22T
PT_GROUP=T node tests/strategy/sizing-study.js $NEW 651 1500 bots v22altT; wait
for l in fin22V v22altV fin22T v22altT; do node tests/strategy/sizing-analyze.js $l bots > $D/sizing_$l.txt; done
echo fertig
