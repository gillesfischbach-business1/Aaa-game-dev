#include "LuxWorldClockSubsystem.h"

#include "Components/LightComponent.h"
#include "Engine/DirectionalLight.h"
#include "EngineUtils.h"
#include "LuxCore/SolarModel.h"
#include "LuxMissionSubsystem.h"
#include "Engine/GameInstance.h"

void ULuxWorldClockSubsystem::Tick(float DeltaTime)
{
	const lux98::Date Before = Clock.GetDate();
	Clock.Advance(DeltaTime);
	if (!(Clock.GetDate() == Before))
	{
		// Tageswechsel: Missionen mit Datumsfenster freischalten
		if (UGameInstance* GI = GetWorld() ? GetWorld()->GetGameInstance() : nullptr)
		{
			if (ULuxMissionSubsystem* M = GI->GetSubsystem<ULuxMissionSubsystem>()) M->RefreshAvailability(Clock.GetDate());
		}
	}
	UpdateSun();
}

TStatId ULuxWorldClockSubsystem::GetStatId() const
{
	RETURN_QUICK_DECLARE_CYCLE_STAT(ULuxWorldClockSubsystem, STATGROUP_Tickables);
}

void ULuxWorldClockSubsystem::SetDateTime(int32 Month, int32 Day, float HourLocal)
{
	Clock.SetDateTime(lux98::Date{1998, Month, Day}, HourLocal);
	UpdateSun();
}

void ULuxWorldClockSubsystem::UpdateSun()
{
	if (!Sun.IsValid())
	{
		for (TActorIterator<ADirectionalLight> It(GetWorld()); It; ++It)
		{
			if (It->ActorHasTag(TEXT("Sun")))
			{
				Sun = *It;
				break;
			}
		}
		if (!Sun.IsValid())
		{
			return;
		}
	}
	double Elevation = 0.0, Azimuth = 0.0;
	lux98::ComputeSunPosition(Clock.GetStandardDate(), Clock.GetStandardHour(), lux98::GeoPosition{}, Elevation, Azimuth);
	SunElevationDeg = static_cast<float>(Elevation);
	// Welt: X = Ost, Y = Sued (siehe Scripts/lux98/geo.py). Licht faellt von der Sonne weg.
	const FRotator LightRotation(-Elevation, Azimuth + 90.0, 0.0);
	Sun->SetActorRotation(LightRotation);
	// Unter dem Horizont: Sonnenlicht aus, Mond/Strassenlicht uebernehmen (spaeter Weather-System).
	Sun->GetLightComponent()->SetIntensity(Elevation > -2.0 ? 10.f : 0.f);
}
