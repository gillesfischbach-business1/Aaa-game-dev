#pragma once

#include "CoreMinimal.h"
#include "UObject/Interface.h"
#include "LuxInteractable.generated.h"

UINTERFACE(MinimalAPI, Blueprintable)
class ULuxInteractable : public UInterface
{
	GENERATED_BODY()
};

// Alles, womit der Spieler interagieren kann: Tueren, Lichtschalter, Telefone, Zeitungsstaende ...
class LUXEMBOURG1998_API ILuxInteractable
{
	GENERATED_BODY()

public:
	// Kurzer Hinweistext, z. B. "Telefonieren" (lokalisiert).
	UFUNCTION(BlueprintNativeEvent, BlueprintCallable, Category = "LUX98|Interaction")
	FText GetInteractionPrompt() const;

	UFUNCTION(BlueprintNativeEvent, BlueprintCallable, Category = "LUX98|Interaction")
	void Interact(APawn* InstigatorPawn);  // nicht "Instigator": verdeckt sonst AActor::Instigator (C4458)
};
