#pragma once

#include "CoreMinimal.h"
#include "Subsystems/WorldSubsystem.h"
#include "LuxCore/Calendar1998.h"
#include "LuxWorldClockSubsystem.generated.h"

class ADirectionalLight;

// Spieluhr des Jahres 1998 und Sonnenstand. Dreht das DirectionalLight mit dem Actor-Tag "Sun".
UCLASS()
class LUXEMBOURG1998_API ULuxWorldClockSubsystem : public UTickableWorldSubsystem
{
	GENERATED_BODY()

public:
	virtual void Tick(float DeltaTime) override;
	virtual TStatId GetStatId() const override;

	UFUNCTION(BlueprintCallable, Category = "LUX98|Time")
	void SetDateTime(int32 Month, int32 Day, float HourLocal);

	UFUNCTION(BlueprintCallable, Category = "LUX98|Time")
	void SetTimeScale(float Scale) { Clock.SetTimeScale(Scale); }

	UFUNCTION(BlueprintPure, Category = "LUX98|Time")
	FString GetClockText() const { return UTF8_TO_TCHAR(Clock.ToString().c_str()); }

	UFUNCTION(BlueprintPure, Category = "LUX98|Time")
	float GetSunElevation() const { return SunElevationDeg; }

	const lux98::GameClock& GetClock() const { return Clock; }
	lux98::GameClock& GetMutableClock() { return Clock; }

private:
	void UpdateSun();

	lux98::GameClock Clock{lux98::Date{1998, 1, 1}, 8.0};
	TWeakObjectPtr<ADirectionalLight> Sun;
	float SunElevationDeg = 0.f;
};
