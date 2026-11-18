import {
  COLORS, OKEY_DECK, adviseOkey, formatCards,
  adviseKing, KING_COUNTS, formatPercent,
  adviseYut, applyYutMove, labelYutPosition,
  initialSeerBelief, adviseSeer, updateSeerBelief,
  FISH_SHAPES, adviseFish, applyFishMove, countFilled, fishMaskAt
} from "./engines.js";

const GAME_META = {
  okey: { titleKey: "game.okey", source: "https://de-wiki.metin2.gameforge.com/index.php/Okey-Karten-Spiel" },
  king: { titleKey: "game.king", source: "https://de-wiki.metin2.gameforge.com/index.php/Schnapp_den_K%C3%B6nig" },
  yut: { titleKey: "game.yut", source: "https://de-wiki.metin2.gameforge.com/index.php/Yutnori" },
  seer: { titleKey: "game.seer", source: "https://de-wiki.metin2.gameforge.com/index.php/Seherwettstreit" },
  fish: { titleKey: "game.fish", source: "https://de-wiki.metin2.gameforge.com/index.php/Fischpuzzlespiel" }
};

const I18N = {
  en: {
    "game.okey":"Okey Card Game","game.king":"Catch the King","game.yut":"Yutnori","game.seer":"Duel of the Seers","game.fish":"Fish Puzzle",
    "global.decision":"Decision engine","global.language":"Language","global.rules":"Rules & method","global.reset":"Reset game","global.best":"Best next move","global.state":"State check","global.complete":"Complete","global.yes":"Yes","global.no":"No","global.undo":"Undo","global.source":"Open the official German Metin2 Wiki page","global.safe":"safe","global.score":"score","global.skip":"Skip to advisor","global.reference":"Reference","global.close":"Close","global.local":"Local only","global.private":"No data leaves this browser","global.perfect":"What “perfect” means here.","global.disclaimer":"The advisor exhausts deterministic legal moves and uses exact known-card probabilities where the rules expose enough information. Hidden server RNG and undocumented AI behavior are shown as uncertainty, never presented as guaranteed outcomes.",
    "okey.track":"Track the 24-card deck","okey.click":"Click: unseen → in hand → used","okey.inHand":"{count}/5 in hand","okey.score":"Current score","okey.target":"Target","okey.silver":"Silver · 300","okey.gold":"Gold · 400","okey.cards":"All cards","okey.deck":"R/B/Y × values 1–8","okey.scoring":"Scoring:","okey.scoringText":"triples score 20–90; mixed runs score 10–60; same-color runs score 50–100. Recommendations use full-deck playouts.","okey.immediate":"Immediate points","okey.unseen":"Unseen cards","okey.finish":"Target chance","okey.play":"Play","okey.discard":"Discard","okey.enter":"Enter all five cards","okey.enterDetail":"{count}/5 cards entered. Complete the hand before solving.","okey.playDetail":"Bank {points} now. Full-deck playouts give this the best finish rate.","okey.discardDetail":"Discard this card; full-deck playouts favor keeping the other four.",
    "king.board":"5 × 5 evidence board","king.help":"Mark reveals, misses, and the 5-card glow clue","king.field":"Field: 7/4/5/5/3/1","king.current":"Current card","king.glowHelp":"Glow clue:","king.glowText":"mark Glow when neighbors flashed; mark No glow only when you clearly observed none.","king.edit":"Edit {cell}","king.unknown":"Unknown","king.noMiss":"No miss","king.miss":"Miss >{value}","king.glow":"Glow ✦","king.noGlow":"No glow ○","king.success":"Success chance","king.expected":"Expected points","king.keep":"Keep card","king.samples":"Boards sampled","king.open":"Open {cell}","king.openDetail":"Best balance of scoring chance, expected points, and retaining the current card.","king.kingDetail":"This cell has the highest posterior King probability ({chance}).","king.conflict":"Clues conflict","king.done":"Board complete","king.doneDetail":"All 25 field cards are known.",
    "yut.board":"Click-to-place board","yut.help":"Select a piece, then click its exact spot","yut.you":"You","yut.cpu":"CPU","yut.yourPiece":"Your {n}","yut.cpuPiece":"CPU {n}","yut.start":"START","yut.finished":"FINISHED","yut.routeHelp":"Corner arrows enter shortcuts. At the center, choose the arrow matching the route the piece arrived on.","yut.throw":"Your throw","yut.back":"Back-do","yut.do":"Do · 1","yut.gae":"Gae · 2","yut.geol":"Geol · 3","yut.yut":"Yut · 4","yut.mo":"Mo · 5","yut.throws":"Throws left","yut.points":"Current points","yut.apply":"Apply recommended move","yut.progress":"Progress","yut.extra":"Extra throw","yut.capture":"capture","yut.finish":"finish","yut.stack":"Stack","yut.piece":"Piece {n}","yut.movePiece":"Move piece {n}","yut.moveStack":"Move stack","yut.pass":"Pass this turn","yut.passDetail":"Back-do cannot move a piece while both are off the board.",
    "seer.tracker":"Bayesian card tracker","seer.colors":"The opponent card is hidden until comparison","seer.rounds":"{count}/9 rounds","seer.shows":"Revealed opponent color","seer.black":"Black · even","seer.white":"White · odd","seer.optimize":"Optimize","seer.wins":"Round wins","seer.coins":"Seer coins","seer.remaining":"Your remaining cards","seer.click":"Click the card you will play","seer.played":"You played {card}. Record the reveal and result.","seer.chooseColor":"Select the revealed opponent color first","seer.conflict":"That result conflicts with the recorded history.","seer.iWon":"I won","seer.equal":"Equal","seer.iLost":"I lost","seer.cancel":"Cancel","seer.history":"Round history","seer.noHistory":"No rounds recorded yet.","seer.round":"Round {n} · played {card} vs {color}","seer.winChance":"Win chance","seer.expectedCoins":"Expected coins","seer.tie":"Tie chance","seer.states":"Possible states","seer.play":"Play {card}","seer.adviceWins":"Best expected round-win value with a two-round Bayesian lookahead before the hidden card is revealed.","seer.adviceCoins":"Best expected coin return with a two-round Bayesian lookahead before the hidden card is revealed.",
    "fish.board":"6 × 4 placement board","fish.fixed":"Pieces do not rotate","fish.filled":"{count}/24 filled","fish.piece":"Piece from the box","fish.deluxe":"Deluxe is 3 × 2","fish.apply":"Apply recommendation","fish.discard":"Discard · +1","fish.attempts":"Attempts","fish.left":"Cells left","fish.tier":"Current tier","fish.remaining":"Expected attempts left","fish.large":"Large","fish.medium":"Medium","fish.small":"Small","fish.reward":"Reward clock:","fish.rewardText":"Large ≤10 attempts, Medium 11–24, Small ≥25. Placing and discarding both cost one attempt.","fish.select":"Select the drawn piece","fish.selectDetail":"Choose the exact fixed orientation shown in Metin2.","fish.place":"Place at {cell}","fish.placeDetail":"Best expected remaining-attempt cost under a depth-2 random-piece search.","fish.discardTitle":"Discard this piece","fish.discardDetail":"Waiting has a lower expected cost than every legal placement.","fish.complete":"Puzzle complete in {count} attempts.","fish.noFit":"That piece does not fit there.","fish.filledCell":"filled",
    "rule.title":"{game} · rules & method","rule.primary":"Primary source"
  },
  de: {
    "game.okey":"Okey-Kartenspiel","game.king":"Schnapp den König","game.yut":"Yutnori","game.seer":"Seherwettstreit","game.fish":"Fischpuzzle",
    "global.decision":"Entscheidungsanalyse","global.language":"Sprache","global.rules":"Regeln & Methode","global.reset":"Spiel zurücksetzen","global.best":"Bester nächster Zug","global.state":"Statusprüfung","global.complete":"Abgeschlossen","global.yes":"Ja","global.no":"Nein","global.undo":"Rückgängig","global.source":"Offizielle deutsche Metin2-Wikiseite öffnen","global.safe":"sicher","global.score":"Wert","global.skip":"Zum Berater springen","global.reference":"Referenz","global.close":"Schließen","global.local":"Nur lokal","global.private":"Keine Daten verlassen diesen Browser","global.perfect":"Was „perfekt“ hier bedeutet.","global.disclaimer":"Der Berater prüft alle deterministischen legalen Züge und nutzt exakte Wahrscheinlichkeiten, soweit die bekannten Karten und Regeln das zulassen. Verdeckter Server-Zufall und undokumentiertes KI-Verhalten werden als Unsicherheit gezeigt, niemals als garantierter Ausgang.",
    "okey.track":"24-Karten-Deck verfolgen","okey.click":"Klick: ungesehen → Hand → verbraucht","okey.inHand":"{count}/5 auf der Hand","okey.score":"Aktuelle Punkte","okey.target":"Ziel","okey.silver":"Silber · 300","okey.gold":"Gold · 400","okey.cards":"Alle Karten","okey.deck":"R/B/G × Werte 1–8","okey.scoring":"Wertung:","okey.scoringText":"Drillinge 20–90; gemischte Reihen 10–60; einfarbige Reihen 50–100. Empfehlungen nutzen vollständige Deck-Simulationen.","okey.immediate":"Sofortpunkte","okey.unseen":"Ungesehene Karten","okey.finish":"Zielchance","okey.play":"Spiele","okey.discard":"Wirf ab","okey.enter":"Alle fünf Karten eingeben","okey.enterDetail":"{count}/5 Karten eingegeben. Vervollständige die Hand.","okey.playDetail":"Jetzt {points} Punkte sichern. Deck-Simulationen zeigen die beste Abschlusschance.","okey.discardDetail":"Diese Karte abwerfen; die anderen vier haben die beste Abschlusschance.",
    "king.board":"5 × 5 Hinweisbrett","king.help":"Aufgedeckte Karten, Fehlversuche und 5er-Leuchten markieren","king.field":"Feld: 7/4/5/5/3/1","king.current":"Aktuelle Karte","king.glowHelp":"Leucht-Hinweis:","king.glowText":"Leuchten markieren, wenn Nachbarn aufblinkten; Kein Leuchten nur bei sicherer Beobachtung.","king.edit":"Bearbeite {cell}","king.unknown":"Unbekannt","king.noMiss":"Kein Fehlversuch","king.miss":"Fehler >{value}","king.glow":"Leuchten ✦","king.noGlow":"Kein Leuchten ○","king.success":"Erfolgschance","king.expected":"Erwartete Punkte","king.keep":"Karte behalten","king.samples":"Simulierte Bretter","king.open":"Öffne {cell}","king.openDetail":"Beste Balance aus Trefferchance, Punkten und Kartenbehalt.","king.kingDetail":"Hier ist die König-Wahrscheinlichkeit am höchsten ({chance}).","king.conflict":"Hinweise widersprechen sich","king.done":"Brett vollständig","king.doneDetail":"Alle 25 Feldkarten sind bekannt.",
    "yut.board":"Brett direkt anklicken","yut.help":"Figur wählen, dann exakte Position anklicken","yut.you":"Du","yut.cpu":"Computer","yut.yourPiece":"Deine {n}","yut.cpuPiece":"CPU {n}","yut.start":"START","yut.finished":"IM ZIEL","yut.routeHelp":"Eckpfeile starten Abkürzungen. In der Mitte den Pfeil der Ankunftsroute wählen.","yut.throw":"Dein Wurf","yut.back":"Back-do","yut.do":"Do · 1","yut.gae":"Gae · 2","yut.geol":"Geol · 3","yut.yut":"Yut · 4","yut.mo":"Mo · 5","yut.throws":"Verbleibende Würfe","yut.points":"Aktuelle Punkte","yut.apply":"Empfohlenen Zug anwenden","yut.progress":"Fortschritt","yut.extra":"Zusatzwurf","yut.capture":"schlagen","yut.finish":"Ziel","yut.stack":"Stapel","yut.piece":"Figur {n}","yut.movePiece":"Figur {n} ziehen","yut.moveStack":"Stapel ziehen","yut.pass":"Zug aussetzen","yut.passDetail":"Mit Back-do kann keine Figur vom Start bewegt werden.",
    "seer.tracker":"Bayes-Kartentracker","seer.colors":"Die Gegnerkarte bleibt bis zum Vergleich verdeckt","seer.rounds":"{count}/9 Runden","seer.shows":"Aufgedeckte Gegnerfarbe","seer.black":"Schwarz · gerade","seer.white":"Weiß · ungerade","seer.optimize":"Optimieren","seer.wins":"Rundensiege","seer.coins":"Sehermünzen","seer.remaining":"Deine übrigen Karten","seer.click":"Die zu spielende Karte anklicken","seer.played":"Du hast {card} gespielt. Aufdeckung und Ergebnis eintragen.","seer.chooseColor":"Zuerst die aufgedeckte Gegnerfarbe wählen","seer.conflict":"Dieses Ergebnis widerspricht dem bisherigen Verlauf.","seer.iWon":"Gewonnen","seer.equal":"Gleich","seer.iLost":"Verloren","seer.cancel":"Abbrechen","seer.history":"Rundenverlauf","seer.noHistory":"Noch keine Runde eingetragen.","seer.round":"Runde {n} · {card} gegen {color}","seer.winChance":"Siegchance","seer.expectedCoins":"Erwartete Münzen","seer.tie":"Gleichstand","seer.states":"Mögliche Zustände","seer.play":"Spiele {card}","seer.adviceWins":"Bester erwarteter Rundensieg mit Bayes-Vorschau über zwei Runden vor der Aufdeckung.","seer.adviceCoins":"Bester erwarteter Münzertrag mit Bayes-Vorschau über zwei Runden vor der Aufdeckung.",
    "fish.board":"6 × 4 Legebrett","fish.fixed":"Teile werden nicht gedreht","fish.filled":"{count}/24 gefüllt","fish.piece":"Teil aus der Box","fish.deluxe":"Deluxe ist 3 × 2","fish.apply":"Empfehlung anwenden","fish.discard":"Wegwerfen · +1","fish.attempts":"Versuche","fish.left":"Freie Felder","fish.tier":"Aktuelle Truhe","fish.remaining":"Erwartete Restversuche","fish.large":"Groß","fish.medium":"Mittel","fish.small":"Klein","fish.reward":"Belohnung:","fish.rewardText":"Groß ≤10, Mittel 11–24, Klein ≥25 Versuche. Legen und Wegwerfen kosten je einen Versuch.","fish.select":"Gezogenes Teil wählen","fish.selectDetail":"Exakt die feste Ausrichtung aus Metin2 wählen.","fish.place":"Bei {cell} ablegen","fish.placeDetail":"Niedrigste erwartete Restversuche in einer Zufallsteile-Suche mit Tiefe 2.","fish.discardTitle":"Teil wegwerfen","fish.discardDetail":"Warten ist im Erwartungswert günstiger als jede mögliche Platzierung.","fish.complete":"Puzzle in {count} Versuchen gelöst.","fish.noFit":"Dieses Teil passt dort nicht.","fish.filledCell":"belegt",
    "rule.title":"{game} · Regeln & Methode","rule.primary":"Primärquelle"
  },
  tr: {
    "game.okey":"Okey Kart Oyunu","game.king":"Kralı Yakala","game.yut":"Yutnori","game.seer":"Kâhinler Düellosu","game.fish":"Balık Yapbozu",
    "global.decision":"Karar motoru","global.language":"Dil","global.rules":"Kurallar ve yöntem","global.reset":"Oyunu sıfırla","global.best":"En iyi sonraki hamle","global.state":"Durum kontrolü","global.complete":"Tamamlandı","global.yes":"Evet","global.no":"Hayır","global.undo":"Geri al","global.source":"Resmî Almanca Metin2 Wiki sayfasını aç","global.safe":"güvenli","global.score":"değer","global.skip":"Danışmana geç","global.reference":"Kaynak","global.close":"Kapat","global.local":"Yalnızca yerel","global.private":"Hiçbir veri bu tarayıcıdan çıkmaz","global.perfect":"Burada “kusursuz” ne demek?","global.disclaimer":"Danışman tüm deterministik yasal hamleleri inceler ve kuralların yeterli bilgi verdiği yerlerde bilinen kartların kesin olasılıklarını kullanır. Gizli sunucu rastgeleliği ve belgelenmemiş yapay zekâ davranışı belirsizlik olarak gösterilir; garanti olarak sunulmaz.",
    "okey.track":"24 kartlık desteyi takip et","okey.click":"Tıkla: görülmedi → elde → kullanıldı","okey.inHand":"Elde {count}/5","okey.score":"Mevcut puan","okey.target":"Hedef","okey.silver":"Gümüş · 300","okey.gold":"Altın · 400","okey.cards":"Tüm kartlar","okey.deck":"K/M/S × 1–8","okey.scoring":"Puanlama:","okey.scoringText":"Üçlüler 20–90; karışık seriler 10–60; aynı renk seriler 50–100. Öneriler tüm deste simülasyonlarını kullanır.","okey.immediate":"Anlık puan","okey.unseen":"Görülmeyen kart","okey.finish":"Hedef şansı","okey.play":"Oyna","okey.discard":"At","okey.enter":"Beş kartın tamamını gir","okey.enterDetail":"{count}/5 kart girildi. Önce eli tamamla.","okey.playDetail":"Şimdi {points} puan al. Deste simülasyonlarında en iyi bitirme olasılığı bu hamlede.","okey.discardDetail":"Bu kartı at; diğer dördünü tutmak en iyi bitirme olasılığını veriyor.",
    "king.board":"5 × 5 ipucu tahtası","king.help":"Açılanları, başarısız denemeleri ve 5 parlamasını işaretle","king.field":"Tahta: 7/4/5/5/3/1","king.current":"Mevcut kart","king.glowHelp":"Parlama ipucu:","king.glowText":"komşular parladıysa Parlama; kesin görmediysen Parlama yok seçme.","king.edit":"{cell} düzenle","king.unknown":"Bilinmiyor","king.noMiss":"Başarısızlık yok","king.miss":"Başarısız >{value}","king.glow":"Parlama ✦","king.noGlow":"Parlama yok ○","king.success":"Başarı şansı","king.expected":"Beklenen puan","king.keep":"Kartı koruma","king.samples":"Örneklenen tahta","king.open":"{cell} aç","king.openDetail":"Başarı şansı, puan ve kartı koruma arasında en iyi denge.","king.kingDetail":"Kral olasılığı en yüksek hücre ({chance}).","king.conflict":"İpuçları çelişiyor","king.done":"Tahta tamamlandı","king.doneDetail":"25 alan kartının tamamı biliniyor.",
    "yut.board":"Tıklayarak taş yerleştir","yut.help":"Taşı seç, sonra tahtadaki yerine tıkla","yut.you":"Sen","yut.cpu":"Bilgisayar","yut.yourPiece":"Senin {n}","yut.cpuPiece":"CPU {n}","yut.start":"BAŞLANGIÇ","yut.finished":"BİTİRDİ","yut.routeHelp":"Köşe okları kestirmeye girer. Merkezde taşın geldiği rotanın okunu seç.","yut.throw":"Atışın","yut.back":"Back-do","yut.do":"Do · 1","yut.gae":"Gae · 2","yut.geol":"Geol · 3","yut.yut":"Yut · 4","yut.mo":"Mo · 5","yut.throws":"Kalan atış","yut.points":"Mevcut puan","yut.apply":"Önerilen hamleyi uygula","yut.progress":"İlerleme","yut.extra":"Ek atış","yut.capture":"yakala","yut.finish":"bitir","yut.stack":"Yığın","yut.piece":"Taş {n}","yut.movePiece":"{n}. taşı oynat","yut.moveStack":"Yığını oynat","yut.pass":"Bu turu geç","yut.passDetail":"İki taş da başlangıçtaysa Back-do ile hamle yapılamaz.",
    "seer.tracker":"Bayes kart takipçisi","seer.colors":"Rakip kartı karşılaştırmaya kadar gizlidir","seer.rounds":"{count}/9 tur","seer.shows":"Açılan rakip rengi","seer.black":"Siyah · çift","seer.white":"Beyaz · tek","seer.optimize":"Hedef","seer.wins":"Tur galibiyeti","seer.coins":"Kâhin parası","seer.remaining":"Kalan kartların","seer.click":"Oynayacağın karta tıkla","seer.played":"{card} oynadın. Açılan rengi ve sonucu kaydet.","seer.chooseColor":"Önce açılan rakip rengini seç","seer.conflict":"Bu sonuç kaydedilmiş geçmişle çelişiyor.","seer.iWon":"Kazandım","seer.equal":"Eşit","seer.iLost":"Kaybettim","seer.cancel":"İptal","seer.history":"Tur geçmişi","seer.noHistory":"Henüz tur kaydedilmedi.","seer.round":"Tur {n} · {card} / {color}","seer.winChance":"Kazanma şansı","seer.expectedCoins":"Beklenen para","seer.tie":"Eşitlik şansı","seer.states":"Olası durum","seer.play":"{card} oyna","seer.adviceWins":"Gizli kart açılmadan önce iki turluk Bayes bakışıyla en iyi beklenen galibiyet değeri.","seer.adviceCoins":"Gizli kart açılmadan önce iki turluk Bayes bakışıyla en iyi beklenen para getirisi.",
    "fish.board":"6 × 4 yerleştirme tahtası","fish.fixed":"Parçalar döndürülemez","fish.filled":"{count}/24 dolu","fish.piece":"Kutudan çıkan parça","fish.deluxe":"Deluxe 3 × 2","fish.apply":"Öneriyi uygula","fish.discard":"At · +1","fish.attempts":"Deneme","fish.left":"Boş hücre","fish.tier":"Mevcut sandık","fish.remaining":"Beklenen kalan deneme","fish.large":"Büyük","fish.medium":"Orta","fish.small":"Küçük","fish.reward":"Ödül sınırı:","fish.rewardText":"Büyük ≤10, Orta 11–24, Küçük ≥25 deneme. Yerleştirme ve atma birer deneme sayılır.","fish.select":"Çıkan parçayı seç","fish.selectDetail":"Metin2'deki sabit yönü aynen seç.","fish.place":"{cell} konumuna yerleştir","fish.placeDetail":"Derinlik 2 rastgele parça aramasında en düşük beklenen kalan deneme.","fish.discardTitle":"Bu parçayı at","fish.discardDetail":"Beklemek, tüm geçerli yerleştirmelerden daha düşük beklenen maliyete sahip.","fish.complete":"Yapboz {count} denemede tamamlandı.","fish.noFit":"Bu parça oraya sığmıyor.","fish.filledCell":"dolu",
    "rule.title":"{game} · kurallar ve yöntem","rule.primary":"Birincil kaynak"
  }
};

function t(key, vars = {}) {
  const template = I18N[state?.language]?.[key] || I18N.en[key] || key;
  return Object.entries(vars).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), template);
}

function yutPositionLabel(position) {
  if (state.language === "en") return labelYutPosition(position);
  const exact = {
    de: { start:"Start",home:"Im Ziel",o5:"Abkürzung unten links",o10:"Abkürzung oben links",o15:"Ecke oben rechts",a1:"Diagonale unten · 1",a2:"Diagonale unten · 2",ca:"Mitte Richtung oben rechts",a3:"Diagonale oben · 1",a4:"Diagonale oben · 2",b1:"Diagonale oben links · 1",b2:"Diagonale oben links · 2",cb:"Mitte Richtung Ziel",b3:"Diagonale unten rechts · 1",b4:"Diagonale unten rechts · 2" },
    tr: { start:"Başlangıç",home:"Bitirdi",o5:"Sol alt kestirme",o10:"Sol üst kestirme",o15:"Sağ üst köşe",a1:"Alt çapraz · 1",a2:"Alt çapraz · 2",ca:"Merkezden sağ üste",a3:"Üst çapraz · 1",a4:"Üst çapraz · 2",b1:"Sol üst çapraz · 1",b2:"Sol üst çapraz · 2",cb:"Merkezden bitişe",b3:"Sağ alt çapraz · 1",b4:"Sağ alt çapraz · 2" }
  }[state.language];
  if (exact[position]) return exact[position];
  const n = Number(position.slice(1));
  const lane = state.language === "de" ? ["Untere Bahn","Linke Bahn","Obere Bahn","Rechte Bahn"] : ["Alt hat","Sol hat","Üst hat","Sağ hat"];
  if (n <= 4) return `${lane[0]} · ${n}`;
  if (n <= 9) return `${lane[1]} · ${n - 5}`;
  if (n <= 14) return `${lane[2]} · ${n - 10}`;
  return `${lane[3]} · ${n - 15}${n === 19 ? (state.language === "de" ? " (ein Schritt zum Ziel)" : " (bitişe bir adım)") : ""}`;
}

function colorLabel(color) {
  const names = { en: { red:"Red", blue:"Blue", yellow:"Yellow" }, de: { red:"Rot", blue:"Blau", yellow:"Gelb" }, tr: { red:"Kırmızı", blue:"Mavi", yellow:"Sarı" } };
  return names[state.language]?.[color] || color;
}

const DEFAULT_STATE = {
  active: "okey",
  language: "en",
  okey: { statuses: {}, score: 0, target: 400 },
  king: { cells: Array.from({ length: 25 }, () => ({})), currentCard: "1", selected: 0 },
  yut: { player: ["start", "start"], cpu: ["start", "start"], roll: 1, movesLeft: 20, score: 250, selectedToken: "p0", history: [] },
  seer: { ownMask: 0x1ff, belief: initialSeerBelief(), color: null, objective: "wins", history: [], selected: null },
  fish: { board: 0, attempts: 0, shapeId: null, history: [] }
};

function cloneDefault() { return structuredClone(DEFAULT_STATE); }
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem("m2-oracle-state"));
    if (!saved) return cloneDefault();
    return {
      ...cloneDefault(), ...saved,
      okey: { ...DEFAULT_STATE.okey, ...saved.okey },
      king: { ...DEFAULT_STATE.king, ...saved.king, cells: saved.king?.cells?.length === 25 ? saved.king.cells : cloneDefault().king.cells },
      yut: { ...DEFAULT_STATE.yut, ...saved.yut },
      seer: { ...DEFAULT_STATE.seer, ...saved.seer },
      fish: { ...DEFAULT_STATE.fish, ...saved.fish }
    };
  } catch { return cloneDefault(); }
}

let state = loadState();
const root = document.querySelector("#game-root");
const toast = document.querySelector("#toast");
const rulesDialog = document.querySelector("#rules-dialog");

function save() { localStorage.setItem("m2-oracle-state", JSON.stringify(state)); }
function commit(render = true) { save(); if (render) renderActive(); }
function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove("show"), 2300);
}

function bind(selector, event, handler) {
  root.querySelectorAll(selector).forEach(element => element.addEventListener(event, handler));
}

function metric(label, value) { return `<div class="metric"><b>${value}</b><small>${label}</small></div>`; }
function bar(value) { return `<div class="prob-bar"><i style="width:${Math.max(0, Math.min(100, value * 100))}%"></i></div>`; }

function applyLanguageChrome() {
  document.documentElement.lang = state.language;
  document.querySelector(".skip-link").textContent = t("global.skip");
  document.querySelector(".topbar .eyebrow").textContent = t("global.decision");
  document.querySelector("#language-label").textContent = t("global.language");
  document.querySelector("#language-select").value = state.language;
  document.querySelector("#rules-button").textContent = t("global.rules");
  document.querySelector("#reset-button").textContent = t("global.reset");
  document.querySelector(".rail-foot b").textContent = t("global.local");
  document.querySelector(".rail-foot small").textContent = t("global.private");
  document.querySelector(".disclaimer b").textContent = t("global.perfect");
  document.querySelector(".disclaimer span").textContent = t("global.disclaimer");
  document.querySelector("#dialog-reference").textContent = t("global.reference");
  document.querySelector("#dialog-close").setAttribute("aria-label", t("global.close"));
  const keys = ["okey", "king", "yut", "seer", "fish"];
  document.querySelectorAll(".nav-item").forEach((button, index) => { button.querySelector("span:last-child").textContent = t(`game.${keys[index]}`); });
}

function localizeAdvice(game, advice) {
  const out = { ...advice };
  if (game === "okey") {
    if (advice.kind === "empty") { out.title = t("okey.enter"); out.detail = t("okey.enterDetail", { count: advice.detail?.match(/\d/)?.[0] || 0 }); }
    else { out.title = `${t(advice.kind === "play" ? "okey.play" : "okey.discard")} ${formatCards(advice.cards)}`; out.detail = t(advice.kind === "play" ? "okey.playDetail" : "okey.discardDetail", { points: advice.immediate || 0 }); }
  }
  if (game === "king") {
    if (advice.kind === "error") { out.title = t("king.conflict"); }
    else if (advice.kind === "done") { out.title = t("king.done"); out.detail = t("king.doneDetail"); }
    else if (advice.kind === "move") { const cell = `${String.fromCharCode(65 + advice.index % 5)}${Math.floor(advice.index / 5) + 1}`; out.title = t("king.open", { cell }); out.detail = advice.kingP && advice.kingP === advice.successP ? t("king.kingDetail", { chance: formatPercent(advice.kingP) }) : t("king.openDetail"); }
  }
  if (game === "yut") {
    if (advice.kind === "pass") { out.title = t("yut.pass"); out.detail = t("yut.passDetail"); }
    else if (advice.kind === "move") {
      out.title = advice.pieces?.length > 1 ? t("yut.moveStack") : t("yut.movePiece", { n: advice.piece + 1 });
      out.detail = `${yutPositionLabel(advice.from)} → ${yutPositionLabel(advice.destination)}${advice.captureCount ? ` · ${t("yut.capture")} ${advice.captureCount}` : ""}${advice.stack ? ` · ${t("yut.stack")}` : ""}`;
    }
  }
  if (game === "seer" && advice.kind === "move") { out.title = t("seer.play", { card: advice.card }); out.detail = t(state.seer.objective === "coins" ? "seer.adviceCoins" : "seer.adviceWins"); }
  if (game === "fish") {
    if (advice.kind === "empty") { out.title = t("fish.select"); out.detail = t("fish.selectDetail"); }
    else if (advice.kind === "discard") { out.title = t("fish.discardTitle"); out.detail = t("fish.discardDetail"); }
    else { const cell = `${String.fromCharCode(65 + advice.anchor % 6)}${Math.floor(advice.anchor / 6) + 1}`; out.title = t("fish.place", { cell }); out.detail = t("fish.placeDetail"); }
  }
  return out;
}

function renderActive() {
  const meta = GAME_META[state.active];
  applyLanguageChrome();
  document.querySelector("#page-title").textContent = t(meta.titleKey);
  document.querySelectorAll(".nav-item").forEach(button => button.classList.toggle("active", button.dataset.game === state.active));
  ({ okey: renderOkey, king: renderKing, yut: renderYut, seer: renderSeer, fish: renderFish })[state.active]();
}

function renderAdvice(advice, metrics = "", ranks = "") {
  const label = advice.kind === "error" ? t("global.state") : advice.kind === "done" ? t("global.complete") : t("global.best");
  return `<aside class="panel advice-panel">
    <div class="recommendation">
      <span class="tag">${label}</span>
      <h2>${advice.title}</h2>
      <p>${advice.detail || ""}</p>
      ${metrics ? `<div class="metric-grid">${metrics}</div>` : ""}
      ${ranks ? `<div class="rank-list">${ranks}</div>` : ""}
    </div>
  </aside>`;
}

function renderOkey() {
  const s = state.okey;
  const hand = OKEY_DECK.filter(card => s.statuses[card.id] === 1);
  const usedIds = OKEY_DECK.filter(card => s.statuses[card.id] === 2).map(card => card.id);
  const advice = localizeAdvice("okey", adviseOkey({ hand, usedIds, score: Number(s.score), target: Number(s.target) }));
  const groups = COLORS.map(color => {
    const cards = OKEY_DECK.filter(card => card.color === color).map(card => {
      const status = s.statuses[card.id] || 0;
      const label = status === 1 ? "hand" : status === 2 ? "used" : "unseen";
      return `<button class="okey-card ${color} ${status === 1 ? "in-hand" : status === 2 ? "used" : ""}" data-card="${card.id}" data-status="${label}" aria-label="${colorLabel(color)} ${card.value}">${card.value}</button>`;
    }).join("");
    return `<div class="palette-group"><div class="palette-name"><i class="color-dot" style="background:var(--${color})"></i>${colorLabel(color)}</div><div class="card-palette">${cards}</div></div>`;
  }).join("");
  const ranks = advice.alternatives?.map((item, i) => `<div class="rank-row"><span class="rank">${i + 2}</span><span>${t(item.kind === "play" ? "okey.play" : "okey.discard")} ${formatCards(item.cards)}</span><small>${formatPercent(item.targetChance || 0)}</small></div>`).join("") || "";
  const metrics = advice.kind === "empty" ? "" : metric(t("okey.immediate"), `+${advice.immediate || 0}`) + metric(t("okey.unseen"), advice.remaining ?? 24) + metric(t("okey.finish"), formatPercent(advice.targetChance || 0));
  root.innerHTML = `<div class="game-layout">
    <section class="panel">
      <div class="panel-head"><div><h2>${t("okey.track")}</h2><p>${t("okey.click")}</p></div><span>${t("okey.inHand", { count: hand.length })}</span></div>
      <div class="panel-body">
        <div class="control-row">
          <div class="field"><label for="okey-score">${t("okey.score")}</label><input id="okey-score" type="number" min="0" step="10" value="${s.score}"></div>
          <div class="field"><label for="okey-target">${t("okey.target")}</label><select id="okey-target"><option value="300" ${s.target == 300 ? "selected" : ""}>${t("okey.silver")}</option><option value="400" ${s.target == 400 ? "selected" : ""}>${t("okey.gold")}</option></select></div>
        </div>
        <div class="divider"></div>
        <p class="section-label">${t("okey.cards")} <span>${t("okey.deck")}</span></p>
        ${groups}
        <div class="divider"></div>
        <div class="notice"><strong>${t("okey.scoring")}</strong> ${t("okey.scoringText")}</div>
      </div>
    </section>
    ${renderAdvice(advice, metrics, ranks)}
  </div>`;
  bind("[data-card]", "click", event => {
    const id = event.currentTarget.dataset.card;
    const current = s.statuses[id] || 0;
    if (current === 0 && hand.length >= 5) { notify("A hand can contain at most five cards."); return; }
    s.statuses[id] = (current + 1) % 3;
    commit();
  });
  root.querySelector("#okey-score").addEventListener("change", e => { s.score = Math.max(0, Number(e.target.value) || 0); commit(); });
  root.querySelector("#okey-target").addEventListener("change", e => { s.target = Number(e.target.value); commit(); });
}

function kingCellLabel(cell) {
  if (cell.value) return cell.value;
  if (cell.min) return `>${cell.min}`;
  return "?";
}

function renderKing() {
  const s = state.king;
  const advice = localizeAdvice("king", adviseKing({ cells: s.cells, currentCard: s.currentCard }));
  const board = s.cells.map((cell, index) => {
    const coord = `${String.fromCharCode(65 + index % 5)}${Math.floor(index / 5) + 1}`;
    return `<button class="king-cell ${cell.value ? "revealed" : ""} ${s.selected === index ? "selected" : ""} ${advice.index === index ? "recommended" : ""}" data-index="${index}" aria-label="${coord}, ${kingCellLabel(cell)}"><span class="coord">${coord}</span>${kingCellLabel(cell)}${cell.glow === true ? `<span class="clue">✦</span>` : cell.glow === false ? `<span class="clue">○</span>` : ""}</button>`;
  }).join("");
  const selected = s.cells[s.selected] || {};
  const values = ["", "1", "2", "3", "4", "5", "K"].map(value => `<button data-value="${value}" class="${(selected.value || "") === value ? "active" : ""}">${value || t("king.unknown")}</button>`).join("");
  const misses = ["", "1", "2", "3", "4", "5"].map(value => `<button data-min="${value}" class="${String(selected.min || "") === value ? "active" : ""}">${value ? t("king.miss", { value }) : t("king.noMiss")}</button>`).join("");
  const glows = [["", t("king.unknown")], ["yes", t("king.glow")], ["no", t("king.noGlow")]].map(([value, label]) => `<button data-glow="${value}" class="${(selected.glow === true ? "yes" : selected.glow === false ? "no" : "") === value ? "active" : ""}">${label}</button>`).join("");
  const ranks = advice.stats?.slice(0, 4).map((item, i) => {
    const coord = `${String.fromCharCode(65 + item.index % 5)}${Math.floor(item.index / 5) + 1}`;
    return `<div class="rank-row"><span class="rank">${i + 1}</span><span>${coord}${bar(item.successP)}</span><small>${formatPercent(item.successP)} ${t("global.safe")}</small></div>`;
  }).join("") || "";
  const metrics = advice.kind === "move" ? metric(t("king.success"), formatPercent(advice.successP)) + metric(t("king.expected"), advice.expected.toFixed(1)) + metric(t("king.keep"), formatPercent(advice.keepP)) + metric(t("king.samples"), advice.samples) : metric(t("king.samples"), advice.samples || 0);
  root.innerHTML = `<div class="game-layout">
    <section class="panel">
      <div class="panel-head"><div><h2>${t("king.board")}</h2><p>${t("king.help")}</p></div><span>${t("king.field")}</span></div>
      <div class="panel-body">
        <div class="control-row">
          <div class="field"><label for="king-card">${t("king.current")}</label><select id="king-card">${["1","2","3","4","5","K"].map(v => `<option ${s.currentCard === v ? "selected" : ""}>${v}</option>`).join("")}</select></div>
          <div class="notice grow"><strong>${t("king.glowHelp")}</strong> ${t("king.glowText")}</div>
        </div>
        <div class="divider"></div>
        <div class="king-board">${board}</div>
        <div class="cell-editor">
          <p class="section-label">${t("king.edit", { cell: `${String.fromCharCode(65 + s.selected % 5)}${Math.floor(s.selected / 5) + 1}` })}</p>
          <div class="segmented">${values}</div>
          <div style="height:9px"></div><div class="segmented">${misses}</div>
          <div style="height:9px"></div><div class="segmented">${glows}</div>
        </div>
      </div>
    </section>
    ${renderAdvice(advice, metrics, ranks)}
  </div>`;
  bind("[data-index]", "click", e => { s.selected = Number(e.currentTarget.dataset.index); commit(); });
  bind("[data-value]", "click", e => { const cell = s.cells[s.selected]; cell.value = e.currentTarget.dataset.value || undefined; if (cell.value) cell.min = undefined; commit(); });
  bind("[data-min]", "click", e => { const cell = s.cells[s.selected]; cell.min = Number(e.currentTarget.dataset.min) || undefined; if (cell.min) cell.value = undefined; commit(); });
  bind("[data-glow]", "click", e => { const value = e.currentTarget.dataset.glow; s.cells[s.selected].glow = value === "yes" ? true : value === "no" ? false : undefined; commit(); });
  root.querySelector("#king-card").addEventListener("change", e => { s.currentCard = e.target.value; commit(); });
}

function yutNodePositions() {
  const nodes = [];
  for (let i = 1; i <= 5; i++) nodes.push({ id:`o${i}`, x:90-i*16, y:90, short: i === 5 ? "↗" : "" });
  for (let i = 6; i <= 10; i++) nodes.push({ id:`o${i}`, x:10, y:90-(i-5)*16, short: i === 10 ? "↘" : "" });
  for (let i = 11; i <= 15; i++) nodes.push({ id:`o${i}`, x:10+(i-10)*16, y:10, short: "" });
  for (let i = 16; i <= 19; i++) nodes.push({ id:`o${i}`, x:90, y:10+(i-15)*16, short: "" });
  nodes.push(
    {id:"a1",x:26,y:74},{id:"a2",x:38,y:62},{id:"ca",x:47.6,y:50,short:"↗"},{id:"a3",x:62,y:38},{id:"a4",x:74,y:26},
    {id:"b1",x:26,y:26},{id:"b2",x:38,y:38},{id:"cb",x:52.4,y:50,short:"↘"},{id:"b3",x:62,y:62},{id:"b4",x:74,y:74}
  );
  return nodes;
}

function renderYut() {
  const s = state.yut;
  const advice = localizeAdvice("yut", adviseYut(s));
  const selectedSide = s.selectedToken[0] === "p" ? "player" : "cpu";
  const selectedIndex = Number(s.selectedToken[1]);
  const tokenAt = position => [
    ...s.player.map((pos, i) => pos === position ? `<i class="token" title="${t("yut.yourPiece", { n: i + 1 })}">${i+1}</i>` : ""),
    ...s.cpu.map((pos, i) => pos === position ? `<i class="token cpu" title="${t("yut.cpuPiece", { n: i + 1 })}">${i+1}</i>` : "")
  ].join("");
  const nodes = yutNodePositions().map(node => {
    const selectedHere = (selectedSide === "player" ? s.player[selectedIndex] : s.cpu[selectedIndex]) === node.id;
    return `<button class="yut-node ${["o5","o10","o15","ca","cb"].includes(node.id) ? "corner" : ""} ${selectedHere ? "selected-position" : ""}" style="left:${node.x}%;top:${node.y}%" data-yut-position="${node.id}" aria-label="${yutPositionLabel(node.id)}" title="${yutPositionLabel(node.id)}"><span class="node-mark">${node.short || ""}</span><span class="tokens">${tokenAt(node.id)}</span></button>`;
  }).join("");
  const tokenButtons = [
    ...s.player.map((pos,i)=>({id:`p${i}`,pos,cpu:false})),
    ...s.cpu.map((pos,i)=>({id:`c${i}`,pos,cpu:true}))
  ].map(item => `<button class="yut-piece-picker ${s.selectedToken===item.id?"active":""}" data-yut-token="${item.id}"><i class="token ${item.cpu?"cpu":""}">${item.id[1]-0+1}</i><span><b>${item.cpu?t("yut.cpuPiece",{n:item.id[1]-0+1}):t("yut.yourPiece",{n:item.id[1]-0+1})}</b><small>${yutPositionLabel(item.pos)}</small></span></button>`).join("");
  const ranks = [advice, ...(advice.alternatives || [])].filter(item => item?.destination).map((item, i) => `<div class="rank-row"><span class="rank">${i + 1}</span><span>${item.pieces?.length > 1 ? t("yut.stack") : t("yut.piece", { n: item.piece + 1 })} → ${yutPositionLabel(item.destination)}</span><small>${item.captureCount ? t("yut.capture") : item.finish ? t("yut.finish") : `+${item.progress}`}</small></div>`).join("");
  const metrics = advice.kind === "move" ? metric(t("yut.progress"), `+${advice.progress}`) + metric(t("yut.throws"), s.movesLeft) + metric(t("yut.points"), s.score) + metric(t("yut.extra"), Number(s.roll) >= 4 ? t("global.yes") : t("global.no")) : metric(t("yut.throws"), s.movesLeft) + metric(t("yut.points"), s.score);
  root.innerHTML = `<div class="game-layout">
    <section class="panel">
      <div class="panel-head"><div><h2>${t("yut.board")}</h2><p>${t("yut.help")}</p></div><div class="yut-legend"><span><i class="token"></i>${t("yut.you")}</span><span><i class="token cpu"></i>${t("yut.cpu")}</span></div></div>
      <div class="panel-body">
        <div class="yut-piece-pickers">${tokenButtons}</div>
        <div class="yut-board">${nodes}</div>
        <div class="yut-docks">
          <button data-yut-position="start" class="yut-dock ${(selectedSide === "player" ? s.player[selectedIndex] : s.cpu[selectedIndex]) === "start" ? "selected-position" : ""}"><span>${t("yut.start")}</span><span class="tokens">${tokenAt("start")}</span></button>
          <p>${t("yut.routeHelp")}</p>
          <button data-yut-position="home" class="yut-dock ${(selectedSide === "player" ? s.player[selectedIndex] : s.cpu[selectedIndex]) === "home" ? "selected-position" : ""}"><span>${t("yut.finished")}</span><span class="tokens">${tokenAt("home")}</span></button>
        </div>
        <div class="divider"></div>
        <p class="section-label">${t("yut.throw")}</p>
        <div class="segmented">${[[-1,t("yut.back")],[1,t("yut.do")],[2,t("yut.gae")],[3,t("yut.geol")],[4,t("yut.yut")],[5,t("yut.mo")]].map(([v,l])=>`<button class="throw-button ${Number(s.roll)===v?"active":""}" data-roll="${v}">${l}</button>`).join("")}</div>
        <div style="height:14px"></div><div class="control-row"><div class="field"><label for="moves-left">${t("yut.throws")}</label><input id="moves-left" type="number" min="0" max="20" value="${s.movesLeft}"></div><div class="field"><label for="yut-score">${t("yut.points")}</label><input id="yut-score" type="number" step="10" value="${s.score}"></div></div>
        <div class="board-actions"><button id="yut-apply" class="primary-button" ${advice.kind==="move"?"":"disabled"}>${t("yut.apply")}</button><button id="yut-undo" class="secondary-button" ${s.history.length?"":"disabled"}>${t("global.undo")}</button></div>
      </div>
    </section>
    ${renderAdvice(advice, metrics, ranks)}
  </div>`;
  bind("[data-yut-token]", "click", e => { s.selectedToken = e.currentTarget.dataset.yutToken; commit(); });
  bind("[data-yut-position]", "click", e => {
    const position = e.currentTarget.dataset.yutPosition;
    const index = Number(s.selectedToken[1]);
    if (s.selectedToken[0] === "p") s.player[index] = position; else s.cpu[index] = position;
    commit();
  });
  bind("[data-roll]", "click", e => { s.roll = Number(e.currentTarget.dataset.roll); commit(); });
  root.querySelector("#moves-left").addEventListener("change", e => { s.movesLeft = Math.max(0, Math.min(20, Number(e.target.value) || 0)); commit(); });
  root.querySelector("#yut-score").addEventListener("change", e => { s.score = Number(e.target.value) || 0; commit(); });
  root.querySelector("#yut-apply").addEventListener("click", () => {
    if (advice.kind !== "move") return;
    s.history.push({ player: [...s.player], cpu: [...s.cpu], movesLeft: s.movesLeft, score: s.score });
    const next = applyYutMove(s, advice);
    s.player = next.player; s.cpu = next.cpu;
    s.movesLeft = Math.max(0, s.movesLeft - 1);
    s.score = s.score - 10 + advice.captureCount * 10 + advice.finishCount * 10;
    commit();
  });
  root.querySelector("#yut-undo").addEventListener("click", () => { const prev = s.history.pop(); if (!prev) return; Object.assign(s, prev); commit(); });
}

function renderSeer() {
  const s = state.seer;
  const advice = localizeAdvice("seer", adviseSeer(s));
  const cards = Array.from({ length: 9 }, (_, card) => {
    const available = Boolean(s.ownMask & (1 << card));
    return `<button class="seer-card ${card % 2 ? "white" : "black"} ${available ? "" : "used"} ${advice.card === card ? "recommended" : ""}" data-seer-card="${card}" ${available ? "" : "disabled"}>${card}</button>`;
  }).join("");
  const ranks = [advice, ...(advice.alternatives || [])].filter(item => item.card !== undefined).map((item, i) => `<div class="rank-row"><span class="rank">${i+1}</span><span>${t("seer.play", { card: item.card })}${bar(item.win)}</span><small>${formatPercent(item.win)}</small></div>`).join("");
  const metrics = advice.kind === "move" ? metric(t("seer.winChance"), formatPercent(advice.win)) + metric(t("seer.expectedCoins"), advice.coins.toFixed(2)) + metric(t("seer.tie"), formatPercent(advice.tie)) + metric(t("seer.states"), s.belief.length) : "";
  const resultName = result => result === "win" ? t("seer.iWon") : result === "tie" ? t("seer.equal") : t("seer.iLost");
  const history = s.history.length ? [...s.history].reverse().map((item, i) => `<div class="history-item"><span>${t("seer.round", { n: s.history.length-i, card: item.card, color: item.color === "black" ? t("seer.black") : t("seer.white") })}</span><b>${resultName(item.result)}</b></div>`).join("") : `<div class="empty-advice">${t("seer.noHistory")}</div>`;
  root.innerHTML = `<div class="game-layout">
    <section class="panel">
      <div class="panel-head"><div><h2>${t("seer.tracker")}</h2><p>${t("seer.colors")}</p></div><span>${t("seer.rounds", { count: s.history.length })}</span></div>
      <div class="panel-body">
        <div class="control-row"><div class="field"><label for="seer-objective">${t("seer.optimize")}</label><select id="seer-objective"><option value="wins" ${s.objective==="wins"?"selected":""}>${t("seer.wins")}</option><option value="coins" ${s.objective==="coins"?"selected":""}>${t("seer.coins")}</option></select></div></div>
        <div class="divider"></div>
        <p class="section-label">${t("seer.remaining")} <span>${t("seer.click")}</span></p>
        <div class="seer-cards">${cards}</div>
        ${s.selected !== null ? `<div class="cell-editor"><p class="section-label">${t("seer.played", { card: s.selected })}</p><p class="field-label">${t("seer.shows")}</p><div class="segmented"><button data-seer-color="black" class="${s.color === "black" ? "active" : ""}">${t("seer.black")}</button><button data-seer-color="white" class="${s.color === "white" ? "active" : ""}">${t("seer.white")}</button></div><div style="height:9px"></div><p class="field-label">${s.color ? "" : t("seer.chooseColor")}</p><div class="segmented"><button data-seer-result="win" ${s.color ? "" : "disabled"}>${t("seer.iWon")}</button><button data-seer-result="tie" ${s.color ? "" : "disabled"}>${t("seer.equal")}</button><button data-seer-result="lose" ${s.color ? "" : "disabled"}>${t("seer.iLost")}</button><button data-seer-cancel>${t("seer.cancel")}</button></div></div>` : ""}
        <div class="divider"></div>
        <p class="section-label">${t("seer.history")}</p><div class="history-list">${history}</div>
      </div>
    </section>
    ${renderAdvice(advice, metrics, ranks)}
  </div>`;
  root.querySelector("#seer-objective").addEventListener("change", e => { s.objective = e.target.value; commit(); });
  bind("[data-seer-card]", "click", e => { s.selected = Number(e.currentTarget.dataset.seerCard); s.color = null; commit(); });
  bind("[data-seer-color]", "click", e => { s.color = e.currentTarget.dataset.seerColor; commit(); });
  bind("[data-seer-cancel]", "click", () => { s.selected = null; s.color = null; commit(); });
  bind("[data-seer-result]", "click", e => {
    const result = e.currentTarget.dataset.seerResult;
    const next = updateSeerBelief(s.belief, s.color, s.selected, result);
    if (!next.length) { notify(t("seer.conflict")); return; }
    s.history.push({ card: s.selected, color: s.color, result });
    s.ownMask &= ~(1 << s.selected);
    s.belief = next;
    s.selected = null;
    s.color = null;
    commit();
  });
}

function shapeHtml(shape) {
  const maxX = Math.max(...shape.cells.map(c => c[0])), maxY = Math.max(...shape.cells.map(c => c[1]));
  let cells = "";
  for (let y = 0; y <= maxY; y++) for (let x = 0; x <= maxX; x++) cells += `<i class="${shape.cells.some(c => c[0]===x&&c[1]===y) ? "" : "empty"}"></i>`;
  return `<span class="shape" style="grid-template-columns:repeat(${maxX+1},11px)">${cells}</span>`;
}

function renderFish() {
  const s = state.fish;
  const advice = localizeAdvice("fish", adviseFish(s));
  const previewMask = advice.kind === "place" ? advice.mask : 0;
  const board = Array.from({ length: 24 }, (_, index) => `<button class="fish-cell ${s.board & (1<<index) ? "filled" : ""} ${previewMask & (1<<index) ? "preview" : ""}" data-fish-cell="${index}" aria-label="${String.fromCharCode(65+index%6)}${Math.floor(index/6)+1}${s.board&(1<<index)?`, ${t("fish.filledCell")}`:""}"></button>`).join("");
  const tray = FISH_SHAPES.map(shape => `<button class="piece-button ${shape.deluxe?"deluxe":""} ${s.shapeId===shape.id?"active":""}" data-shape="${shape.id}" title="${shape.name}">${shapeHtml(shape)}<small>${shape.id}</small></button>`).join("");
  const remaining = 24 - countFilled(s.board);
  const tier = s.attempts <= 10 ? t("fish.large") : s.attempts <= 24 ? t("fish.medium") : t("fish.small");
  const metrics = metric(t("fish.attempts"), s.attempts) + metric(t("fish.left"), remaining) + metric(t("fish.tier"), tier) + metric(t("fish.remaining"), advice.expectedRemaining?.toFixed(1) || "—");
  const ranks = advice.alternatives?.slice(0,3).map((item,i)=> item.anchor !== undefined ? `<div class="rank-row"><span class="rank">${i+2}</span><span>${String.fromCharCode(65+item.anchor%6)}${Math.floor(item.anchor/6)+1}</span><small>${t("global.score")} ${item.score.toFixed(1)}</small></div>` : "").join("") || "";
  root.innerHTML = `<div class="game-layout">
    <section class="panel">
      <div class="panel-head"><div><h2>${t("fish.board")}</h2><p>${t("fish.fixed")}</p></div><span>${t("fish.filled", { count: countFilled(s.board) })}</span></div>
      <div class="panel-body">
        <p class="section-label">${t("fish.piece")} <span>${t("fish.deluxe")}</span></p>
        <div class="piece-tray">${tray}</div>
        <div class="divider"></div>
        <div class="fish-board">${board}</div>
        <div class="board-actions">
          <button id="fish-apply" class="primary-button" ${advice.kind==="place"?"":"disabled"}>${t("fish.apply")}</button>
          <button id="fish-discard" class="secondary-button" ${s.shapeId?"":"disabled"}>${t("fish.discard")}</button>
          <button id="fish-undo" class="secondary-button" ${s.history.length?"":"disabled"}>${t("global.undo")}</button>
        </div>
        <div class="divider"></div>
        <div class="notice ${s.attempts>=8&&s.attempts<=10?"warn":""}"><strong>${t("fish.reward")}</strong> ${t("fish.rewardText")}</div>
      </div>
    </section>
    ${renderAdvice(advice, metrics, ranks)}
  </div>`;
  bind("[data-shape]", "click", e => { s.shapeId = e.currentTarget.dataset.shape; commit(); });
  root.querySelector("#fish-apply").addEventListener("click", () => {
    if (advice.kind !== "place") return;
    s.history.push({ board: s.board, attempts: s.attempts, shapeId: s.shapeId });
    s.board = applyFishMove(s.board, s.shapeId, advice.anchor);
    s.attempts++;
    s.shapeId = null;
    commit();
    if (countFilled(s.board) === 24) notify(t("fish.complete", { count: s.attempts }));
  });
  root.querySelector("#fish-discard").addEventListener("click", () => {
    if (!s.shapeId) return;
    s.history.push({ board: s.board, attempts: s.attempts, shapeId: s.shapeId });
    s.attempts++; s.shapeId = null; commit();
  });
  root.querySelector("#fish-undo").addEventListener("click", () => { const prev = s.history.pop(); if (!prev) return; Object.assign(s, prev); commit(); });
  bind("[data-fish-cell]", "click", e => {
    if (!s.shapeId) return;
    const anchor = Number(e.currentTarget.dataset.fishCell);
    const next = applyFishMove(s.board, s.shapeId, anchor);
    if (next === null) { notify(t("fish.noFit")); return; }
    s.history.push({ board: s.board, attempts: s.attempts, shapeId: s.shapeId });
    s.board = next; s.attempts++; s.shapeId = null; commit();
  });
}

const RULE_TEXT = {
  en: {
    okey: `<p>Mark all five visible cards and every card already played or discarded. Score either three equal values in all colors or three consecutive values; same-color runs add 40 points.</p><h3>Method</h3><p>Every legal current play and discard is tested through deterministic full-deck playouts, ranking both expected score and the chance of reaching your chest target.</p>`,
    king: `<p>The field contains 7×1, 4×2, 5×3, 5×4, 3×5 and 1×K. Completing any row or column adds 10 points. The 5 trap includes all eight neighboring cells, diagonals included.</p><h3>Method</h3><p>Only complete boards compatible with every reveal, miss and glow clue are sampled. Cells are ranked by points, card retention, 5-trap risk, line bonuses and King probability.</p>`,
    yut: `<p>Do/Gae/Geol move 1/2/3; Yut and Mo move 4/5 and grant another throw. Back-do moves back one. Exact landings capture or stack, and stacked pieces move together.</p><h3>Method</h3><p>Every legal piece or stack move is checked for exact route progress, shortcuts, captures, finishing, and the weighted probability of being captured on the computer's next throw.</p>`,
    seer: `<p>Both sides have 0–8 once. Even is black and odd is white. Choose your card while the opponent card is hidden; after comparison, record its color and your win, tie or loss.</p><h3>Method</h3><p>The tracker keeps all weighted opponent hands consistent with history and uses a two-round Bayesian lookahead under a uniformly random opponent policy.</p>`,
    fish: `<p>The board is 6×4. All six standard pieces have fixed orientation: notably, piece 4 is a vertical 1×3 bar. Deluxe is a 3×2 block. Placing or discarding costs one attempt.</p><h3>Method</h3><p>Every legal anchor is evaluated with a depth-2 expected-draw search. The solver may discard when waiting has a lower expected attempt cost.</p>`
  },
  de: {
    okey: `<p>Alle fünf sichtbaren sowie alle gespielten oder abgeworfenen Karten markieren. Punkte geben drei gleiche Werte in allen Farben oder drei aufeinanderfolgende Werte; einfarbige Reihen erhalten 40 Bonuspunkte.</p><h3>Methode</h3><p>Jeder legale Zug und Abwurf wird in vollständigen Deck-Simulationen geprüft und nach Erwartungswert sowie Truhenziel-Chance bewertet.</p>`,
    king: `<p>Das Feld enthält 7×1, 4×2, 5×3, 5×4, 3×5 und 1×K. Jede vollständige Reihe oder Spalte gibt 10 Bonuspunkte. Die 5er-Falle umfasst alle acht Nachbarfelder inklusive Diagonalen.</p><h3>Methode</h3><p>Es werden nur vollständige Bretter simuliert, die zu allen Aufdeckungen, Fehlern und Leucht-Hinweisen passen.</p>`,
    yut: `<p>Do/Gae/Geol ziehen 1/2/3; Yut und Mo 4/5 mit Zusatzwurf. Back-do zieht eins zurück. Exakte Landungen schlagen oder stapeln; gestapelte Figuren ziehen gemeinsam.</p><h3>Methode</h3><p>Jeder legale Figuren- oder Stapelzug wird auf Route, Abkürzung, Schlagen, Ziel und die gewichtete Rückschlagwahrscheinlichkeit geprüft.</p>`,
    seer: `<p>Beide Seiten besitzen 0–8 einmal. Gerade Karten sind schwarz, ungerade weiß. Die eigene Karte wird bei verdeckter Gegnerkarte gewählt; danach Gegnerfarbe und Sieg, Gleichstand oder Niederlage eintragen.</p><h3>Methode</h3><p>Der Tracker hält alle zur Historie passenden Gegnerhände gewichtet und rechnet zwei Runden Bayes-Vorschau.</p>`,
    fish: `<p>Das Brett ist 6×4. Alle sechs Standardteile haben eine feste Ausrichtung; Teil 4 ist ein senkrechter 1×3-Balken. Deluxe ist 3×2. Legen oder Wegwerfen kostet je einen Versuch.</p><h3>Methode</h3><p>Jeder legale Anker wird mit einer Zufallsteile-Suche der Tiefe 2 bewertet. Warten kann optimal sein.</p>`
  },
  tr: {
    okey: `<p>Görünen beş kartın ve oynanmış ya da atılmış tüm kartların tamamını işaretle. Üç renkte aynı değer veya art arda üç değer puan verir; aynı renk seri 40 ek puan alır.</p><h3>Yöntem</h3><p>Her yasal oyun ve atış, tüm deste simülasyonlarıyla beklenen puan ve sandık hedefine ulaşma şansına göre değerlendirilir.</p>`,
    king: `<p>Tahta 7×1, 4×2, 5×3, 5×4, 3×5 ve 1×K içerir. Tamamlanan her satır veya sütun 10 ek puan verir. 5 tuzağı çaprazlar dâhil sekiz komşuyu kapsar.</p><h3>Yöntem</h3><p>Yalnızca tüm açılan kartlar, başarısızlıklar ve parlama ipuçlarıyla uyumlu tahtalar örneklenir.</p>`,
    yut: `<p>Do/Gae/Geol 1/2/3; Yut ve Mo 4/5 ilerler ve ek atış verir. Back-do bir geri gider. Tam iniş yakalar veya üst üste bindirir; yığındaki taşlar birlikte gider.</p><h3>Yöntem</h3><p>Her yasal taş veya yığın hamlesi rota, kestirme, yakalama, bitiş ve bilgisayarın sonraki atışında yakalama olasılığıyla değerlendirilir.</p>`,
    seer: `<p>İki tarafta da 0–8 birer kez bulunur. Çift kart siyah, tek kart beyazdır. Rakip kart gizliyken kendi kartını seç; karşılaştırmadan sonra rakip rengini ve kazanma, eşitlik veya kaybı kaydet.</p><h3>Yöntem</h3><p>Takipçi geçmişle uyumlu tüm rakip ellerini ağırlıklı tutar ve iki turluk Bayes bakışı kullanır.</p>`,
    fish: `<p>Tahta 6×4'tür. Altı standart parçanın yönü sabittir; özellikle 4 numaralı parça dikey 1×3 çubuktur. Deluxe 3×2'dir. Yerleştirme veya atma bir deneme sayılır.</p><h3>Yöntem</h3><p>Her yasal konum derinlik 2 beklenen parça aramasıyla değerlendirilir. Beklemek daha ucuzsa parça atılır.</p>`
  }
};

document.querySelectorAll(".nav-item").forEach(button => button.addEventListener("click", () => { state.active = button.dataset.game; commit(); }));
document.querySelector("#reset-button").addEventListener("click", () => {
  state[state.active] = cloneDefault()[state.active];
  commit();
});
document.querySelector("#language-select").addEventListener("change", event => { state.language = event.target.value; commit(); });
document.querySelector("#rules-button").addEventListener("click", () => {
  const meta = GAME_META[state.active];
  document.querySelector("#dialog-title").textContent = t("rule.title", { game: t(meta.titleKey) });
  document.querySelector("#dialog-content").innerHTML = `${RULE_TEXT[state.language][state.active]}<h3>${t("rule.primary")}</h3><p><a href="${meta.source}" target="_blank" rel="noreferrer">${t("global.source")}</a></p>`;
  rulesDialog.showModal();
});
document.querySelector("#dialog-close").addEventListener("click", () => rulesDialog.close());
rulesDialog.addEventListener("click", event => { if (event.target === rulesDialog) rulesDialog.close(); });

if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("./sw.js").catch(() => {});
renderActive();
