#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "LuxCore/Notebook.h"
#include "LuxNotebookSubsystem.generated.h"

UENUM(BlueprintType)
enum class ELuxNoteKind : uint8 { Address, Phone, Appointment, Clue, Photo, Bill };

USTRUCT(BlueprintType)
struct FLuxNote
{
	GENERATED_BODY()
	UPROPERTY(BlueprintReadOnly) FString Id;
	UPROPERTY(BlueprintReadOnly) ELuxNoteKind Kind = ELuxNoteKind::Clue;
	UPROPERTY(BlueprintReadOnly) FString Text;
	UPROPERTY(BlueprintReadOnly) FString MissionId;
	UPROPERTY(BlueprintReadOnly) float AtHours = -1.f;
	UPROPERTY(BlueprintReadOnly) bool bStruck = false;
};

// Analoges Notizbuch des Spielers (Spezifikation Abschnitt 08), Huelle um lux98::Notebook.
UCLASS()
class LUXEMBOURG1998_API ULuxNotebookSubsystem : public UGameInstanceSubsystem
{
	GENERATED_BODY()

public:
	UFUNCTION(BlueprintCallable, Category = "LUX98|Notebook")
	void WriteNote(const FString& Id, ELuxNoteKind Kind, const FString& Text, const FString& MissionId, float AtHours = -1.f, float UntilHours = -1.f);

	UFUNCTION(BlueprintCallable, Category = "LUX98|Notebook")
	bool StrikeNote(const FString& Id) { return Book.Strike(TCHAR_TO_UTF8(*Id)); }

	UFUNCTION(BlueprintPure, Category = "LUX98|Notebook")
	TArray<FLuxNote> GetNotes(ELuxNoteKind Kind, bool bIncludeStruck) const;

	UFUNCTION(BlueprintPure, Category = "LUX98|Notebook")
	TArray<FLuxNote> GetMissionNotes(const FString& MissionId) const;

	UFUNCTION(BlueprintPure, Category = "LUX98|Notebook")
	TArray<FLuxNote> GetUpcomingAppointments(float NowHours, float WithinHours) const;

	lux98::Notebook& GetBook() { return Book; }

private:
	static FLuxNote ToNote(const lux98::NoteEntry& E);
	lux98::Notebook Book;
};
