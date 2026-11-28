# Naechster Schritt

## A – braucht den Windows-PC des Nutzers (blockiert hier)
1. UE 5.6 + Visual Studio 2022 installieren (README), Projekt oeffnen, Build "Development Editor".
2. Compilerfehler beheben (Unreal-Huellen wurden noch nie kompiliert).
3. Testkarte `Content/Maps/L_TestGround` anlegen: Ebene + DirectionalLight (Tag `Sun`) + SkyAtmosphere +
   VolumetricCloud + PlayerStart. Input-Assets (IMC_Default, IA_Move, IA_Look, IA_Jump, IA_Sprint, IA_Interact,
   IA_ToggleView) anlegen und im Blueprint von `ALuxCharacter` zuweisen.
4. Vorlagen-Fahrzeug aus dem UE-Vehicle-Template als Blueprint von `ALuxVehiclePawn` einrichten (Platzhalter `PH_`).

## B – hier sofort weitermachbar
0. Browser-Fassung: Rueckmeldung des Nutzers einholen (M01–M03, M05, Arbeit, Touch, Internetcafe sind fertig).
   Fertig ausserdem: M06 (drei Ausgaenge), Autoradio, M07 mit Kamera und Fotoauftraegen. Danach: M08 „Millennium“
   (Dezember 1998, Abschluss der ersten Geschichte, Folgen aus allen Entscheidungen); Verdeckungspruefung fuer Fotos;
   Wohnung als Innenraum; bessere Figuren (CC0-Modelle); Browser-Test in mehrere Dateien teilen (Laufzeit).
   M04 bleibt gesperrt, bis Fouer-Termine 1998 belegt.
1. (erledigt) Dialogsystem und Notizbuch im Kern + Unreal-Huellen – Unreal-Huellen beim ersten Windows-Build pruefen.
2. Weitere Dialoge aus der Browser-Fassung nach Data/Dialogue uebertragen, damit beide Fassungen sie teilen.
3. GIS-Pipeline fuer Unreal: `bake_web.py`-Ausgabe (bereits EPSG:2169-basiert) als Import fuer Unreal nutzen.
4. Quellen beschaffen fuer die offenen Kernfragen in `HISTORICAL_RESEARCH.md` (Fouer-Termine 1998 zuerst).
