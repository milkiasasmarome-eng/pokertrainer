/* Vollstaendige Aufzaehlung aller 5- und 7-Karten-Haende zur Pruefung der Haeufigkeiten. */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static int straight_high(int m) { /* m: 13-bit rank mask, bit12 = Ass; returns 14-bit top index or -1 */
  int m2 = (m << 1) | ((m >> 12) & 1);
  for (int top = 13; top >= 4; top--) if (((m2 >> (top - 4)) & 0x1F) == 0x1F) return top;
  return -1;
}
static int topbits(int m, int n) { /* encode top n ranks of mask into nibbles */
  int v = 0, k = 0;
  for (int r = 12; r >= 0 && k < n; r--) if (m & (1 << r)) { v = (v << 4) | r; k++; }
  return v;
}
/* returns category*2^20 + kickers; categories: 8 SF,7 quads,6 FH,5 flush,4 straight,3 trips,2 two pair,1 pair,0 high */
static int eval(const int *c, int n) {
  int cnt[13] = {0}, sm[4] = {0}, rm = 0;
  for (int i = 0; i < n; i++) { int r = c[i] >> 2, s = c[i] & 3; cnt[r]++; sm[s] |= 1 << r; rm |= 1 << r; }
  for (int s = 0; s < 4; s++) if (__builtin_popcount(sm[s]) >= 5) {
    int sh = straight_high(sm[s]);
    if (sh >= 0) return (8 << 20) | sh;
    return (5 << 20) | topbits(sm[s], 5);
  }
  int q = -1, t1 = -1, t2 = -1, p1 = -1, p2 = -1, p3 = -1;
  for (int r = 12; r >= 0; r--) {
    if (cnt[r] == 4) q = r;
    else if (cnt[r] == 3) { if (t1 < 0) t1 = r; else if (t2 < 0) t2 = r; }
    else if (cnt[r] == 2) { if (p1 < 0) p1 = r; else if (p2 < 0) p2 = r; else p3 = r; }
  }
  if (q >= 0) return (7 << 20) | (q << 4) | (topbits(rm & ~(1 << q), 1));
  if (t1 >= 0) { int pr = t2 > p1 ? t2 : p1; if (pr >= 0) return (6 << 20) | (t1 << 4) | pr; }
  int sh = straight_high(rm);
  if (sh >= 0) return (4 << 20) | sh;
  if (t1 >= 0) return (3 << 20) | (t1 << 8) | topbits(rm & ~(1 << t1), 2);
  if (p2 >= 0) return (2 << 20) | (p1 << 8) | (p2 << 4) | topbits(rm & ~(1 << p1) & ~(1 << p2), 1);
  if (p1 >= 0) return (1 << 20) | (p1 << 12) | topbits(rm & ~(1 << p1), 3);
  return topbits(rm, 5);
}
static const char *names[9] = {"High card","One pair","Two pair","Three of a kind","Straight","Flush","Full house","Four of a kind","Straight flush"};
static unsigned char *seen;
int main(void) {
  seen = calloc(9 << 20, 1);
  long long cat[9] = {0}, tot = 0; int c[7];
  for (c[0]=0;c[0]<52;c[0]++) for (c[1]=c[0]+1;c[1]<52;c[1]++) for (c[2]=c[1]+1;c[2]<52;c[2]++)
  for (c[3]=c[2]+1;c[3]<52;c[3]++) for (c[4]=c[3]+1;c[4]<52;c[4]++) { int v = eval(c,5); cat[v>>20]++; seen[v] = 1; tot++; }
  long long dist[9] = {0}, dt = 0;
  for (int v = 0; v < (9 << 20); v++) if (seen[v]) { dist[v >> 20]++; dt++; }
  printf("5 cards: total %lld, distinct values %lld\n", tot, dt);
  for (int k = 8; k >= 0; k--) printf("  %-16s %10lld  distinct %5lld\n", names[k], cat[k], dist[k]);
  memset(seen, 0, 9 << 20); memset(cat, 0, sizeof cat); tot = 0;
  for (c[0]=0;c[0]<52;c[0]++) for (c[1]=c[0]+1;c[1]<52;c[1]++) for (c[2]=c[1]+1;c[2]<52;c[2]++)
  for (c[3]=c[2]+1;c[3]<52;c[3]++) for (c[4]=c[3]+1;c[4]<52;c[4]++) for (c[5]=c[4]+1;c[5]<52;c[5]++)
  for (c[6]=c[5]+1;c[6]<52;c[6]++) { int v = eval(c,7); cat[v>>20]++; seen[v] = 1; tot++; }
  memset(dist, 0, sizeof dist); dt = 0;
  for (int v = 0; v < (9 << 20); v++) if (seen[v]) { dist[v >> 20]++; dt++; }
  printf("7 cards (best 5): total %lld, distinct values %lld\n", tot, dt);
  for (int k = 8; k >= 0; k--) printf("  %-16s %10lld  distinct %5lld\n", names[k], cat[k], dist[k]);
  return 0;
}
