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

	void RefreshAvailability(const lux98::Date& Today) { Tracker.Refresh(Today); }
	lux98::MissionTracker& GetTracker() { return Tracker; }

private:
	void LoadMissionFile(const FString& Path);
	lux98::MissionTracker Tracker;
};
