using UnrealBuildTool;

public class Luxembourg1998EditorTarget : TargetRules
{
	public Luxembourg1998EditorTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Editor;
		DefaultBuildSettings = BuildSettingsVersion.Latest;
		IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
		ExtraModuleNames.AddRange(new string[] { "Luxembourg1998", "Luxembourg1998Editor" });
	}
}
