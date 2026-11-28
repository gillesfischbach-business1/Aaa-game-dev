# Naechster Schritt

## A – braucht den Windows-PC des Nutzers (blockiert hier)
1. UE 5.6 + Visual Studio 2022 installieren (README), Projekt oeffnen, Build "Development Editor".
2. Compilerfehler beheben (Unreal-Huellen wurden noch nie kompiliert).
3. Testkarte `Content/Maps/L_TestGround` anlegen: Ebene + DirectionalLight (Tag `Sun`) + SkyAtmosphere +
   VolumetricCloud + PlayerStart. Input-Assets (IMC_Default, IA_Move, IA_Look, IA_Jump, IA_Sprint, IA_Interact,
   IA_ToggleView) anlegen und im Blueprint von `ALuxCharacter` zuweisen.
4. Vorlagen-Fahrzeug aus dem UE-Vehicle-Template als Blueprint von `ALuxVehiclePawn` einrichten (Platzhalter `PH_`).

## B – hier sofort weitermachbar
0. Browser-Fassung: Rueckmeldung des Nutzers einholen; Mission 03 „D'Nummer an der Zeitung“ (Zeitungskiosk,
   Kleinanzeige); Arbeitsschichten in der Garage (Karriere Mechaniker); Touch-Steuerung; Innenraeume; CC0-Figuren.
1. Dialogsystem im Kern (Knoten, Bedingungen, Sprachen lb/de/fr/en) + Tests.
2. Notizbuch-Modell (Adressen, Nummern, Termine, Fotos) + Tests.
3. GIS-Pipeline fuer Unreal: `bake_web.py`-Ausgabe (bereits EPSG:2169-basiert) als Import fuer Unreal nutzen.
4. Quellen beschaffen fuer die offenen Kernfragen in `HISTORICAL_RESEARCH.md` (Fouer-Termine 1998 zuerst).
