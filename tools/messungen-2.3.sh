#!/bin/sh
# Abschließende Kalibrierungsmessungen 2.3 (Arbeitspakete 5 und 6). Rohdaten und Zusammenfassungen in tests/results/calib-2.3/.
# Aufruf: sh tools/messungen-2.3.sh <Arbeitsbaum 2.1.0> <Arbeitsbaum 2.2.0>
# Gruppen: V und T (Gegner-KI), Ka23 (Kalibrierungsgruppe), F23 (abschließende Testgruppe, erst nach dem Einfrieren), final (Regressionsset).
set -e
cd "$(dirname "$0")/.."
OLD=${1:-../wt-v210}; V22=${2:-../wt-v220}; NEW=$(pwd); D=tests/results/calib-2.3; mkdir -p $D
for g in V:31:5000 T:32:4000 p23:Ka:33:4000 f23:34:4000 final:35:3000; do
  G=$(echo $g | sed 's/:[0-9]*:[0-9]*$//'); R=${g#$G:}; S=${R%%:*}; H=${R#*:}; N=$(echo $G | tr ':' '-')
  node tests/strategy/range-calib.js $S $H $G $D/rc_${N}_210.json $OLD &
  node tests/strategy/range-calib.js $S $H $G $D/rc_${N}_23.json $NEW; wait
  node tests/strategy/range-calib.js $S $H $G $D/rc_${N}_220.json $V22
done
for g in V:41:2500 T:42:2500 p23:Ka:43:2500 f23:44:2500; do
  G=$(echo $g | sed 's/:[0-9]*:[0-9]*$//'); R=${g#$G:}; S=${R%%:*}; H=${R#*:}; N=$(echo $G | tr ':' '-')
  node tests/strategy/equity-calib.js $S $H $G $D/ec_${N}_210.json $OLD &
  node tests/strategy/equity-calib.js $S $H $G $D/ec_${N}_23.json $NEW; wait
done
for f in $D/rc_*.json $D/ec_*.json; do case $f in *.sum.json) ;; *) node tests/strategy/calib-report.js $f --json ${f%.json}.sum.json > /dev/null;; esac; done
# Reaktionsmodell: Fold-Vorhersage je Größe gegen die gegenfaktische Ausspielung (V und T)
rm -f tests/results/sizing-study/fin23-*
env PT_GROUP=V node tests/strategy/sizing-study.js $NEW 741 1500 bots fin23V &
env PT_GROUP=T node tests/strategy/sizing-study.js $NEW 751 1500 bots fin23T; wait
for l in fin23V fin23T; do node tests/strategy/sizing-analyze.js $l bots > $D/sizing_$l.txt; done
echo fertig
