# Naechster Schritt

## A – braucht den Windows-PC des Nutzers (blockiert hier)
1. UE 5.6 + Visual Studio 2022 installieren (README), Projekt oeffnen, Build "Development Editor".
2. Compilerfehler beheben (Unreal-Huellen wurden noch nie kompiliert).
3. Testkarte `Content/Maps/L_TestGround` anlegen: Ebene + DirectionalLight (Tag `Sun`) + SkyAtmosphere +
   VolumetricCloud + PlayerStart. Input-Assets (IMC_Default, IA_Move, IA_Look, IA_Jump, IA_Sprint, IA_Interact,
   IA_ToggleView) anlegen und im Blueprint von `ALuxCharacter` zuweisen.
4. Vorlagen-Fahrzeug aus dem UE-Vehicle-Template als Blueprint von `ALuxVehiclePawn` einrichten (Platzhalter `PH_`).

## B – hier sofort weitermachbar
1. Dialogsystem im Kern (Knoten, Bedingungen, Sprachen lb/de/fr/en) + Tests.
2. Notizbuch-Modell (Adressen, Nummern, Termine, Fotos) + Tests.
3. GIS-Pipeline Schritt 1: OSM-Ausschnitt Gare/Ville Haute laden, nach EPSG:2169 umrechnen, Strassen/Gebaeude als
   JSON fuer Unreal exportieren (moderne Geometrie, als "nicht historisch geprueft" markiert).
4. Quellen beschaffen fuer die offenen Kernfragen in `HISTORICAL_RESEARCH.md` (Fouer-Termine 1998 zuerst).
