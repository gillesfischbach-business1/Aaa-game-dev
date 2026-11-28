using UnrealBuildTool;

public class Luxembourg1998Target : TargetRules
{
	public Luxembourg1998Target(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Game;
		DefaultBuildSettings = BuildSettingsVersion.Latest;
		IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
		ExtraModuleNames.Add("Luxembourg1998");
	}
}
