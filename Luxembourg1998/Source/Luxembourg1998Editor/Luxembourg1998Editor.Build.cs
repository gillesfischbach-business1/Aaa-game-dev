using UnrealBuildTool;

public class Luxembourg1998Editor : ModuleRules
{
	public Luxembourg1998Editor(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
		PublicDependencyModuleNames.AddRange(new string[] { "Core", "CoreUObject", "Engine", "UnrealEd", "Luxembourg1998" });
	}
}
