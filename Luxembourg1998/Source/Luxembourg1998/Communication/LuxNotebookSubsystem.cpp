#include "LuxNotebookSubsystem.h"

void ULuxNotebookSubsystem::WriteNote(const FString& Id, ELuxNoteKind Kind, const FString& Text, const FString& MissionId, float AtHours, float UntilHours)
{
	lux98::NoteEntry E;
	E.id = TCHAR_TO_UTF8(*Id);
	E.kind = static_cast<lux98::NoteKind>(static_cast<uint8>(Kind));  // gleiche Reihenfolge wie lux98::NoteKind
	E.text = TCHAR_TO_UTF8(*Text);
	E.missionId = TCHAR_TO_UTF8(*MissionId);
	E.atHours = AtHours;
	E.untilHours = UntilHours;
	Book.Write(E);
}

FLuxNote ULuxNotebookSubsystem::ToNote(const lux98::NoteEntry& E)
{
	FLuxNote N;
	N.Id = UTF8_TO_TCHAR(E.id.c_str());
	N.Kind = static_cast<ELuxNoteKind>(static_cast<uint8>(E.kind));
	N.Text = UTF8_TO_TCHAR(E.text.c_str());
	N.MissionId = UTF8_TO_TCHAR(E.missionId.c_str());
	N.AtHours = static_cast<float>(E.atHours);
	N.bStruck = E.struck;
	return N;
}

TArray<FLuxNote> ULuxNotebookSubsystem::GetNotes(ELuxNoteKind Kind, bool bIncludeStruck) const
{
	TArray<FLuxNote> Out;
	for (const auto& E : Book.ByKind(static_cast<lux98::NoteKind>(static_cast<uint8>(Kind)), bIncludeStruck)) Out.Add(ToNote(E));
	return Out;
}

TArray<FLuxNote> ULuxNotebookSubsystem::GetMissionNotes(const FString& MissionId) const
{
	TArray<FLuxNote> Out;
	for (const auto& E : Book.ForMission(TCHAR_TO_UTF8(*MissionId))) Out.Add(ToNote(E));
	return Out;
}

TArray<FLuxNote> ULuxNotebookSubsystem::GetUpcomingAppointments(float NowHours, float WithinHours) const
{
	TArray<FLuxNote> Out;
	for (const auto& E : Book.UpcomingAppointments(NowHours, WithinHours)) Out.Add(ToNote(E));
	return Out;
}
