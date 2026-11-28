#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "LuxSaveSubsystem.generated.h"

// Mehrere Spielstand-Plaetze, Autosave, Pruefsumme und automatische Sicherungskopie (.bak).
// Format: Source/Luxembourg1998/Core/Public/LuxCore/SaveFormat.h
UCLASS()
class LUXEMBOURG1998_API ULuxSaveSubsystem : public UGameInstanceSubsystem
{
	GENERATED_BODY()

public:
	static constexpr int32 AutosaveSlot = 0;

	UFUNCTION(BlueprintCallable, Category = "LUX98|Save")
	bool SaveToSlot(int32 Slot);

	UFUNCTION(BlueprintCallable, Category = "LUX98|Save")
	bool LoadFromSlot(int32 Slot);

	UFUNCTION(BlueprintPure, Category = "LUX98|Save")
	static FString GetSlotPath(int32 Slot);
};
