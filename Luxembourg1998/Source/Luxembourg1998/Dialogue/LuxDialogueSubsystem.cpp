#include "LuxDialogueSubsystem.h"

#include "Dom/JsonObject.h"
#include "HAL/FileManager.h"
#include "Misc/FileHelper.h"
#include "Misc/Paths.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

DEFINE_LOG_CATEGORY_STATIC(LogLuxDialogue, Log, All);

namespace
{
std::string ToStd(const FString& S) { return std::string(TCHAR_TO_UTF8(*S)); }
FString FromStd(const std::string& S) { return FString(UTF8_TO_TCHAR(S.c_str())); }

lux98::LocalizedText ReadText(const TSharedPtr<FJsonObject>& Obj)
{
	lux98::LocalizedText T;
	if (!Obj.IsValid()) return T;
	const TPair<const TCHAR*, lux98::Lang> Keys[] = {{TEXT("lb"), lux98::Lang::LB}, {TEXT("de"), lux98::Lang::DE}, {TEXT("fr"), lux98::Lang::FR}, {TEXT("en"), lux98::Lang::EN}};
	for (const auto& K : Keys)
	{
		FString V;
		if (Obj->TryGetStringField(K.Key, V)) T.text[K.Value] = ToStd(V);
	}
	return T;
}

std::vector<std::string> ReadStrings(const TSharedPtr<FJsonObject>& Obj, const TCHAR* Field)
{
	std::vector<std::string> Out;
	const TArray<TSharedPtr<FJsonValue>>* Arr = nullptr;
	if (Obj->TryGetArrayField(Field, Arr))
		for (const TSharedPtr<FJsonValue>& V : *Arr) Out.push_back(ToStd(V->AsString()));
	return Out;
}

void ReadCondition(const TSharedPtr<FJsonObject>& Obj, lux98::FlagCondition& C)
{
	C.requireSet = ReadStrings(Obj, TEXT("require_flags"));
	C.requireUnset = ReadStrings(Obj, TEXT("forbid_flags"));
}
}  // namespace

void ULuxDialogueSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);
	const FString Dir = FPaths::Combine(FPaths::ProjectDir(), TEXT("Data/Dialogue"));
	TArray<FString> Files;
	IFileManager::Get().FindFiles(Files, *FPaths::Combine(Dir, TEXT("*.json")), true, false);
	for (const FString& F : Files) LoadFile(FPaths::Combine(Dir, F));
	UE_LOG(LogLuxDialogue, Log, TEXT("%d Dialoge geladen"), Graphs.Num());
}

void ULuxDialogueSubsystem::LoadFile(const FString& Path)
{
	FString Text;
	TSharedPtr<FJsonObject> Root;
	if (!FFileHelper::LoadFileToString(Text, *Path) || !FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(Text), Root) || !Root.IsValid())
	{
		UE_LOG(LogLuxDialogue, Error, TEXT("Dialogdatei unlesbar: %s"), *Path);
		return;
	}
	TSharedPtr<lux98::DialogueGraph> Graph = MakeShared<lux98::DialogueGraph>();
	for (const TSharedPtr<FJsonValue>& NV : Root->GetArrayField(TEXT("nodes")))
	{
		const TSharedPtr<FJsonObject> N = NV->AsObject();
		lux98::DialogueNode Node;
		Node.id = ToStd(N->GetStringField(TEXT("id")));
		FString Tmp;
		if (N->TryGetStringField(TEXT("speaker"), Tmp)) Node.speaker = ToStd(Tmp);
		Node.text = ReadText(N->GetObjectField(TEXT("text")));
		if (N->TryGetStringField(TEXT("next"), Tmp)) Node.next = ToStd(Tmp);
		if (N->TryGetStringField(TEXT("skip_to"), Tmp)) Node.skipTo = ToStd(Tmp);
		Node.setFlags = ReadStrings(N, TEXT("set_flags"));
		ReadCondition(N, Node.condition);
		const TArray<TSharedPtr<FJsonValue>>* Choices = nullptr;
		if (N->TryGetArrayField(TEXT("choices"), Choices))
		{
			for (const TSharedPtr<FJsonValue>& CV : *Choices)
			{
				const TSharedPtr<FJsonObject> C = CV->AsObject();
				lux98::DialogueChoice Choice;
				Choice.text = ReadText(C->GetObjectField(TEXT("text")));
				if (C->TryGetStringField(TEXT("next"), Tmp)) Choice.next = ToStd(Tmp);
				Choice.setFlags = ReadStrings(C, TEXT("set_flags"));
				ReadCondition(C, Choice.condition);
				Node.choices.push_back(Choice);
			}
		}
		std::string Error;
		if (!Graph->Add(Node, &Error)) UE_LOG(LogLuxDialogue, Error, TEXT("%s: %s"), *Path, *FromStd(Error));
	}
	const FString Id = Root->GetStringField(TEXT("dialogue_id"));
	const FString Start = Root->GetStringField(TEXT("start"));
	for (const lux98::DialogueIssue& I : Graph->Validate(ToStd(Start)))
	{
		UE_LOG(LogLuxDialogue, Warning, TEXT("%s [%s]: %s"), *Id, *FromStd(I.nodeId), *FromStd(I.message));
	}
	Graphs.Add(Id, Graph);
	StartNodes.Add(Id, Start);
}

lux98::Lang ULuxDialogueSubsystem::ToLang() const
{
	switch (SubtitleLanguage)
	{
	case ELuxSubtitleLanguage::French: return lux98::Lang::FR;
	case ELuxSubtitleLanguage::English: return lux98::Lang::EN;
	case ELuxSubtitleLanguage::Luxembourgish: return lux98::Lang::LB;
	default: return lux98::Lang::DE;
	}
}

bool ULuxDialogueSubsystem::StartDialogue(const FString& DialogueId)
{
	const TSharedPtr<lux98::DialogueGraph>* G = Graphs.Find(DialogueId);
	if (!G) return false;
	ActiveGraph = *G;
	Runner = MakeUnique<lux98::DialogueRunner>(*ActiveGraph, Flags);
	const bool bOk = Runner->Start(ToStd(StartNodes[DialogueId]));
	OnDialogueChanged.Broadcast();
	return bOk;
}

FString ULuxDialogueSubsystem::GetSpeaker() const { return Runner.IsValid() ? FromStd(Runner->Speaker()) : FString(); }
FString ULuxDialogueSubsystem::GetSpoken() const { return Runner.IsValid() ? FromStd(Runner->Spoken()) : FString(); }
FString ULuxDialogueSubsystem::GetSubtitle() const { return Runner.IsValid() ? FromStd(Runner->Subtitle(ToLang())) : FString(); }

void ULuxDialogueSubsystem::GetChoices(TArray<FString>& Texts, TArray<int32>& ChoiceIndices) const
{
	Texts.Reset();
	ChoiceIndices.Reset();
	if (!Runner.IsValid()) return;
	for (const auto& C : Runner->VisibleChoices(ToLang()))
	{
		ChoiceIndices.Add(static_cast<int32>(C.first));
		Texts.Add(FromStd(C.second));
	}
}

bool ULuxDialogueSubsystem::Advance()
{
	const bool bOk = Runner.IsValid() && Runner->Advance();
	OnDialogueChanged.Broadcast();
	return bOk;
}

bool ULuxDialogueSubsystem::Choose(int32 ChoiceIndex)
{
	const bool bOk = Runner.IsValid() && ChoiceIndex >= 0 && Runner->Choose(static_cast<size_t>(ChoiceIndex));
	OnDialogueChanged.Broadcast();
	return bOk;
}

std::map<std::string, std::string> ULuxDialogueSubsystem::SaveFlags() const
{
	std::map<std::string, std::string> Out;
	for (const std::string& F : Flags) Out["dflag." + F] = "1";
	return Out;
}

void ULuxDialogueSubsystem::LoadFlags(const std::map<std::string, std::string>& Data)
{
	Flags.clear();
	for (const auto& KV : Data)
		if (KV.first.rfind("dflag.", 0) == 0) Flags.insert(KV.first.substr(6));
}
