# Naechster Schritt

## A – braucht den Windows-PC des Nutzers (blockiert hier)
1. UE 5.6 + Visual Studio 2022 installieren (README), Projekt oeffnen, Build "Development Editor".
2. Compilerfehler beheben (Unreal-Huellen wurden noch nie kompiliert).
3. Testkarte `Content/Maps/L_TestGround` anlegen: Ebene + DirectionalLight (Tag `Sun`) + SkyAtmosphere +
   VolumetricCloud + PlayerStart. Input-Assets (IMC_Default, IA_Move, IA_Look, IA_Jump, IA_Sprint, IA_Interact,
   IA_ToggleView) anlegen und im Blueprint von `ALuxCharacter` zuweisen.
4. Vorlagen-Fahrzeug aus dem UE-Vehicle-Template als Blueprint von `ALuxVehiclePawn` einrichten (Platzhalter `PH_`).

## B – hier sofort weitermachbar
0. Browser-Fassung: Rueckmeldung des Nutzers einholen (M01–M03, Arbeit, Touch sind fertig). Danach: Mission 05
   „Déi verluer Diskett“ (Internetcafe, fiktives Offline-Internet) – M04 Schueberfouer bleibt gesperrt, bis die
   Termine 1998 belegt sind; Innenraeume; bessere Figuren (CC0-Modelle); Radiosender.
1. Dialogsystem im C++-Kern (Knoten, Bedingungen, Sprachen lb/de/fr/en) + Tests – siehe Sitzung 1, Teil 5.
2. Notizbuch-Modell im C++-Kern (Adressen, Nummern, Termine, Hinweise) + Tests – siehe Sitzung 1, Teil 5.
3. GIS-Pipeline fuer Unreal: `bake_web.py`-Ausgabe (bereits EPSG:2169-basiert) als Import fuer Unreal nutzen.
4. Quellen beschaffen fuer die offenen Kernfragen in `HISTORICAL_RESEARCH.md` (Fouer-Termine 1998 zuerst).
