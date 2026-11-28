#include "LuxSaveSubsystem.h"

#include "Engine/GameInstance.h"
#include "Engine/World.h"
#include "GameFramework/Pawn.h"
#include "GameFramework/PlayerController.h"
#include "HAL/FileManager.h"
#include "LuxCore/SaveFormat.h"
#include "LuxEconomySubsystem.h"
#include "LuxMissionSubsystem.h"
#include "LuxDialogueSubsystem.h"
#include "LuxNotebookSubsystem.h"
#include "LuxWorldClockSubsystem.h"
#include "Misc/Paths.h"

DEFINE_LOG_CATEGORY_STATIC(LogLuxSave, Log, All);

namespace
{
std::string Num(double V) { return std::to_string(V); }
}

FString ULuxSaveSubsystem::GetSlotPath(int32 Slot)
{
	return FPaths::Combine(FPaths::ProjectSavedDir(), TEXT("SaveGames"), FString::Printf(TEXT("slot%02d.lux98"), Slot));
}

bool ULuxSaveSubsystem::SaveToSlot(int32 Slot)
{
	lux98::SaveData Data;
	UWorld* World = GetGameInstance()->GetWorld();
	if (ULuxWorldClockSubsystem* Clock = World ? World->GetSubsystem<ULuxWorldClockSubsystem>() : nullptr)
	{
		Data["clock.std_date"] = Clock->GetClock().GetStandardDate().ToIso();
		Data["clock.std_hour"] = Num(Clock->GetClock().GetStandardHour());
	}
	if (ULuxEconomySubsystem* Eco = GetGameInstance()->GetSubsystem<ULuxEconomySubsystem>())
	{
		Data["money.cash"] = std::to_string(Eco->GetCash());
		Data["money.bank"] = std::to_string(Eco->GetBank());
	}
	if (ULuxMissionSubsystem* Missions = GetGameInstance()->GetSubsystem<ULuxMissionSubsystem>())
	{
		for (const auto& KV : Missions->GetTracker().Serialize()) Data[KV.first] = KV.second;
	}
	if (ULuxDialogueSubsystem* Dlg = GetGameInstance()->GetSubsystem<ULuxDialogueSubsystem>())
	{
		for (const auto& KV : Dlg->SaveFlags()) Data[KV.first] = KV.second;
	}
	if (ULuxNotebookSubsystem* Nb = GetGameInstance()->GetSubsystem<ULuxNotebookSubsystem>())
	{
		for (const auto& KV : Nb->GetBook().Serialize()) Data[KV.first] = KV.second;
	}
	if (APlayerController* PC = World ? World->GetFirstPlayerController() : nullptr)
	{
		if (const APawn* Pawn = PC->GetPawn())
		{
			const FVector L = Pawn->GetActorLocation();
			Data["player.location"] = Num(L.X) + "," + Num(L.Y) + "," + Num(L.Z);
			Data["player.yaw"] = Num(Pawn->GetActorRotation().Yaw);
		}
	}

	IFileManager::Get().MakeDirectory(*FPaths::GetPath(GetSlotPath(Slot)), true);
	std::string Error;
	if (!lux98::WriteSaveFile(TCHAR_TO_UTF8(*GetSlotPath(Slot)), Data, &Error))
	{
		UE_LOG(LogLuxSave, Error, TEXT("Speichern fehlgeschlagen: %s"), UTF8_TO_TCHAR(Error.c_str()));
		return false;
	}
	return true;
}

bool ULuxSaveSubsystem::LoadFromSlot(int32 Slot)
{
	bool bUsedBackup = false;
	lux98::SaveError Err = lux98::SaveError::None;
	const auto Data = lux98::ReadSaveFile(TCHAR_TO_UTF8(*GetSlotPath(Slot)), &bUsedBackup, &Err);
	if (!Data)
	{
		UE_LOG(LogLuxSave, Error, TEXT("Spielstand %d unlesbar: %s"), Slot, UTF8_TO_TCHAR(lux98::ToString(Err)));
		return false;
	}
	if (bUsedBackup)
	{
		UE_LOG(LogLuxSave, Warning, TEXT("Spielstand %d war beschaedigt - Sicherungskopie geladen"), Slot);
	}
	auto Get = [&](const char* Key) -> FString {
		auto It = Data->find(Key);
		return It == Data->end() ? FString() : FString(UTF8_TO_TCHAR(It->second.c_str()));
	};

	UWorld* World = GetGameInstance()->GetWorld();
	if (ULuxWorldClockSubsystem* Clock = World ? World->GetSubsystem<ULuxWorldClockSubsystem>() : nullptr)
	{
		lux98::Date D;
		if (lux98::Date::FromIso(TCHAR_TO_UTF8(*Get("clock.std_date")), D))
		{
			// gespeichert wird Normalzeit -> direkt so setzen (keine Umrechnung ueber die Wanduhr)
			const double StdHour = FCString::Atod(*Get("clock.std_hour"));
			Clock->GetMutableClock().SetStandardDateTime(D, StdHour);
		}
	}
	if (ULuxEconomySubsystem* Eco = GetGameInstance()->GetSubsystem<ULuxEconomySubsystem>())
	{
		Eco->ResetWallet(FCString::Atoi64(*Get("money.cash")), FCString::Atoi64(*Get("money.bank")));
	}
	if (ULuxMissionSubsystem* Missions = GetGameInstance()->GetSubsystem<ULuxMissionSubsystem>())
	{
		if (!Missions->GetTracker().Deserialize(*Data))
		{
			UE_LOG(LogTemp, Warning, TEXT("LUX98: Missionsdaten im Spielstand unlesbar - Missionen unveraendert"));
		}
		lux98::Date Today{1998, 1, 1};
		if (ULuxWorldClockSubsystem* C = World ? World->GetSubsystem<ULuxWorldClockSubsystem>() : nullptr) Today = C->GetClock().GetDate();
		Missions->RefreshAvailability(Today);
	}
	if (ULuxDialogueSubsystem* Dlg = GetGameInstance()->GetSubsystem<ULuxDialogueSubsystem>())
	{
		Dlg->LoadFlags(*Data);
	}
	if (ULuxNotebookSubsystem* Nb = GetGameInstance()->GetSubsystem<ULuxNotebookSubsystem>())
	{
		Nb->GetBook().Deserialize(*Data);
	}
	if (APlayerController* PC = World ? World->GetFirstPlayerController() : nullptr)
	{
		TArray<FString> Parts;
		if (APawn* Pawn = PC->GetPawn(); Pawn && Get("player.location").ParseIntoArray(Parts, TEXT(",")) == 3)
		{
			Pawn->SetActorLocation(FVector(FCString::Atod(*Parts[0]), FCString::Atod(*Parts[1]), FCString::Atod(*Parts[2])));
			Pawn->SetActorRotation(FRotator(0.0, FCString::Atod(*Get("player.yaw")), 0.0));
		}
	}
	return true;
}
