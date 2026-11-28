#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "LuxCore/Dialogue.h"
#include "LuxDialogueSubsystem.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE(FLuxDialogueChanged);

UENUM(BlueprintType)
enum class ELuxSubtitleLanguage : uint8 { German, French, English, Luxembourgish };

// Laedt Dialoge aus Data/Dialogue/*.json (Format siehe Data/Dialogue/M02_muller.json, geprueft vom Python-Pruefer)
// und spielt sie ueber den engine-freien lux98::DialogueRunner ab. Flags sind Teil des Spielstands.
UCLASS()
class LUXEMBOURG1998_API ULuxDialogueSubsystem : public UGameInstanceSubsystem
{
	GENERATED_BODY()

public:
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;

	UFUNCTION(BlueprintCallable, Category = "LUX98|Dialogue")
	bool StartDialogue(const FString& DialogueId);

	UFUNCTION(BlueprintPure, Category = "LUX98|Dialogue")
	bool IsActive() const { return Runner.IsValid() && Runner->IsActive(); }

	UFUNCTION(BlueprintPure, Category = "LUX98|Dialogue")
	FString GetSpeaker() const;

	/** Gesprochene Zeile (Luxemburgisch) */
	UFUNCTION(BlueprintPure, Category = "LUX98|Dialogue")
	FString GetSpoken() const;

	UFUNCTION(BlueprintPure, Category = "LUX98|Dialogue")
	FString GetSubtitle() const;

	/** Sichtbare Auswahl: Text je Eintrag; Index fuer Choose() ist ChoiceIndices[i] */
	UFUNCTION(BlueprintCallable, Category = "LUX98|Dialogue")
	void GetChoices(TArray<FString>& Texts, TArray<int32>& ChoiceIndices) const;

	UFUNCTION(BlueprintCallable, Category = "LUX98|Dialogue")
	bool Advance();

	UFUNCTION(BlueprintCallable, Category = "LUX98|Dialogue")
	bool Choose(int32 ChoiceIndex);

	UFUNCTION(BlueprintPure, Category = "LUX98|Dialogue")
	bool HasFlag(const FString& Flag) const { return Flags.count(TCHAR_TO_UTF8(*Flag)) > 0; }

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "LUX98|Dialogue")
	ELuxSubtitleLanguage SubtitleLanguage = ELuxSubtitleLanguage::German;

	UPROPERTY(BlueprintAssignable, Category = "LUX98|Dialogue")
	FLuxDialogueChanged OnDialogueChanged;

	// Spielstand
	std::map<std::string, std::string> SaveFlags() const;
	void LoadFlags(const std::map<std::string, std::string>& Data);

private:
	void LoadFile(const FString& Path);
	lux98::Lang ToLang() const;

	TMap<FString, TSharedPtr<lux98::DialogueGraph>> Graphs;
	TMap<FString, FString> StartNodes;
	TSharedPtr<lux98::DialogueGraph> ActiveGraph;
	TUniquePtr<lux98::DialogueRunner> Runner;
	std::set<std::string> Flags;
};
