#pragma once

#include "CoreMinimal.h"
#include "WheeledVehiclePawn.h"
#include "InputActionValue.h"
#include "LuxVehiclePawn.generated.h"

class UCameraComponent;
class USpringArmComponent;
class UInputMappingContext;
class UInputAction;

// Grundfahrzeug auf Chaos Vehicles. Raeder, Motor und Getriebe werden im Blueprint je Modell eingestellt
// (Daten: Data/Vehicles/vehicles_1998.csv). Verschleiss, Verbrauch und Schaeden folgen in Phase 2.
UCLASS()
class LUXEMBOURG1998_API ALuxVehiclePawn : public AWheeledVehiclePawn
{
	GENERATED_BODY()

public:
	ALuxVehiclePawn();
	virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;
	virtual void PossessedBy(AController* NewController) override;

	UFUNCTION(BlueprintPure, Category = "LUX98|Vehicle")
	float GetSpeedKmh() const;

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "LUX98|Vehicle")
	FString VehicleDataId;  // z. B. "VEH_REF_W124"

protected:
	UPROPERTY(VisibleAnywhere, Category = "Camera")
	TObjectPtr<USpringArmComponent> ChaseArm;
	UPROPERTY(VisibleAnywhere, Category = "Camera")
	TObjectPtr<UCameraComponent> ChaseCamera;
	UPROPERTY(VisibleAnywhere, Category = "Camera")
	TObjectPtr<UCameraComponent> CockpitCamera;

	UPROPERTY(EditDefaultsOnly, Category = "Input")
	TObjectPtr<UInputMappingContext> VehicleMappingContext;
	UPROPERTY(EditDefaultsOnly, Category = "Input")
	TObjectPtr<UInputAction> ThrottleAction;
	UPROPERTY(EditDefaultsOnly, Category = "Input")
	TObjectPtr<UInputAction> BrakeAction;
	UPROPERTY(EditDefaultsOnly, Category = "Input")
	TObjectPtr<UInputAction> SteerAction;
	UPROPERTY(EditDefaultsOnly, Category = "Input")
	TObjectPtr<UInputAction> HandbrakeAction;
	UPROPERTY(EditDefaultsOnly, Category = "Input")
	TObjectPtr<UInputAction> ToggleCameraAction;

private:
	void Throttle(const FInputActionValue& Value);
	void Brake(const FInputActionValue& Value);
	void Steer(const FInputActionValue& Value);
	void HandbrakeOn();
	void HandbrakeOff();
	void ToggleCamera();
};
