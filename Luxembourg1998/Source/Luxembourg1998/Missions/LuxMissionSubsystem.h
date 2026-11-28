#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "LuxCore/MissionSystem.h"
#include "LuxMissionSubsystem.generated.h"

// Laedt Missionen aus Data/Missions/*.json (vom Python-Pruefer validiert) in den engine-freien Tracker.
UCLASS()
class LUXEMBOURG1998_API ULuxMissionSubsystem : public UGameInstanceSubsystem
{
	GENERATED_BODY()

public:
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;

	UFUNCTION(BlueprintCallable, Category = "LUX98|Missions")
	bool StartMission(const FString& MissionId);

	UFUNCTION(BlueprintCallable, Category = "LUX98|Missions")
	bool CompleteObjective(const FString& MissionId, const FString& ObjectiveId);

	UFUNCTION(BlueprintCallable, Category = "LUX98|Missions")
	bool FailMission(const FString& MissionId, const FString& Reason);

	UFUNCTION(BlueprintPure, Category = "LUX98|Missions")
	FString GetMissionState(const FString& MissionId) const;

	// Freischaltung neu pruefen: bei Tageswechsel (Weltuhr), nach dem Laden und nach jedem Missionserfolg
	void RefreshAvailability(const lux98::Date& Today) { LastDate = Today; Tracker.Refresh(Today); }

	UFUNCTION(BlueprintCallable, Category = "LUX98|Missions")
	void RefreshForDate(int32 Year, int32 Month, int32 Day) { RefreshAvailability(lux98::Date{Year, Month, Day}); }
	lux98::MissionTracker& GetTracker() { return Tracker; }

private:
	void LoadMissionFile(const FString& Path);
	lux98::MissionTracker Tracker;
	lux98::Date LastDate{1998, 1, 1};
};
