#include "LuxMissionSubsystem.h"

#include "Dom/JsonObject.h"
#include "HAL/FileManager.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

DEFINE_LOG_CATEGORY_STATIC(LogLuxMissions, Log, All);

namespace
{
std::string ToStd(const FString& S) { return std::string(TCHAR_TO_UTF8(*S)); }

TOptional<lux98::Date> ReadDate(const TSharedPtr<FJsonObject>& Obj, const FString& Field)
{
	FString Text;
	lux98::Date D;
	if (Obj->TryGetStringField(Field, Text) && lux98::Date::FromIso(ToStd(Text), D))
	{
		return D;
	}
	return {};
}
}  // namespace

void ULuxMissionSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);
	const FString Dir = FPaths::Combine(FPaths::ProjectDir(), TEXT("Data/Missions"));
	TArray<FString> Files;
	IFileManager::Get().FindFiles(Files, *FPaths::Combine(Dir, TEXT("*.json")), true, false);
	for (const FString& File : Files)
	{
		LoadMissionFile(FPaths::Combine(Dir, File));
	}
	Tracker.Refresh(lux98::Date{1998, 1, 1});
}

void ULuxMissionSubsystem::LoadMissionFile(const FString& Path)
{
	FString Text;
	if (!FFileHelper::LoadFileToString(Text, *Path))
	{
		UE_LOG(LogLuxMissions, Error, TEXT("Kann %s nicht lesen"), *Path);
		return;
	}
	TSharedPtr<FJsonObject> Root;
	if (!FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(Text), Root) || !Root.IsValid())
	{
		UE_LOG(LogLuxMissions, Error, TEXT("%s ist kein gueltiges JSON"), *Path);
		return;
	}

	// Ereignisse: Missionen an unbelegten Terminen bleiben gesperrt (Startdatum nach 1998).
	TMap<FString, TPair<TOptional<lux98::Date>, TOptional<lux98::Date>>> Events;
	for (const TSharedPtr<FJsonValue>& V : Root->GetArrayField(TEXT("events")))
	{
		const TSharedPtr<FJsonObject> E = V->AsObject();
		Events.Add(E->GetStringField(TEXT("event_id")), {ReadDate(E, TEXT("start")), ReadDate(E, TEXT("end"))});
	}

	for (const TSharedPtr<FJsonValue>& V : Root->GetArrayField(TEXT("missions")))
	{
		const TSharedPtr<FJsonObject> M = V->AsObject();
		lux98::MissionDef Def;
		Def.id = ToStd(M->GetStringField(TEXT("mission_id")));
		for (const TSharedPtr<FJsonValue>& P : M->GetArrayField(TEXT("prerequisites")))
		{
			Def.prerequisites.push_back(ToStd(P->AsString()));
		}
		for (const TSharedPtr<FJsonValue>& F : M->GetArrayField(TEXT("fail_conditions")))
		{
			Def.failConditions.push_back(ToStd(F->AsString()));
		}
		for (const TSharedPtr<FJsonValue>& O : M->GetArrayField(TEXT("objectives")))
		{
			const TSharedPtr<FJsonObject> Obj = O->AsObject();
			lux98::ObjectiveDef Od;
			Od.id = ToStd(Obj->GetStringField(TEXT("id")));
			FString Group;
			if (Obj->TryGetStringField(TEXT("group"), Group)) Od.alternativeGroup = ToStd(Group);
			Obj->TryGetBoolField(TEXT("optional"), Od.optional);
			Obj->TryGetBoolField(TEXT("checkpoint"), Od.isCheckpoint);
			Def.objectives.push_back(Od);
		}
		if (TOptional<lux98::Date> From = ReadDate(M, TEXT("available_from"))) Def.availableFrom = *From;
		if (TOptional<lux98::Date> Until = ReadDate(M, TEXT("available_until"))) Def.availableUntil = *Until;
		FString EventId;
		if (M->TryGetStringField(TEXT("event"), EventId))
		{
			const auto* Ev = Events.Find(EventId);
			if (Ev && Ev->Key.IsSet() && Ev->Value.IsSet())
			{
				Def.availableFrom = *Ev->Key;
				Def.availableUntil = *Ev->Value;
			}
			else
			{
				Def.availableFrom = lux98::Date{1999, 1, 1};  // Termin unbelegt -> gesperrt
			}
		}
		std::string Error;
		if (!Tracker.Register(Def, &Error))
		{
			UE_LOG(LogLuxMissions, Error, TEXT("%s"), UTF8_TO_TCHAR(Error.c_str()));
		}
	}
}

bool ULuxMissionSubsystem::StartMission(const FString& MissionId) { return Tracker.Start(ToStd(MissionId)); }

bool ULuxMissionSubsystem::CompleteObjective(const FString& MissionId, const FString& ObjectiveId)
{
	return Tracker.CompleteObjective(ToStd(MissionId), ToStd(ObjectiveId));
}

bool ULuxMissionSubsystem::FailMission(const FString& MissionId, const FString& Reason)
{
	return Tracker.Fail(ToStd(MissionId), ToStd(Reason));
}

FString ULuxMissionSubsystem::GetMissionState(const FString& MissionId) const
{
	return UTF8_TO_TCHAR(lux98::ToString(Tracker.GetState(ToStd(MissionId))));
}
