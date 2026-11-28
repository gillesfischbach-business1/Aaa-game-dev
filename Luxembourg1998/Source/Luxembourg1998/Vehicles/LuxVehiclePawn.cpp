#include "LuxVehiclePawn.h"

#include "Camera/CameraComponent.h"
#include "ChaosWheeledVehicleMovementComponent.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "GameFramework/PlayerController.h"
#include "GameFramework/SpringArmComponent.h"

ALuxVehiclePawn::ALuxVehiclePawn()
{
	ChaseArm = CreateDefaultSubobject<USpringArmComponent>(TEXT("ChaseArm"));
	ChaseArm->SetupAttachment(GetMesh());
	ChaseArm->TargetArmLength = 600.f;
	ChaseArm->SocketOffset = FVector(0.f, 0.f, 160.f);
	ChaseArm->bEnableCameraRotationLag = true;
	ChaseArm->CameraRotationLagSpeed = 6.f;

	ChaseCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("ChaseCamera"));
	ChaseCamera->SetupAttachment(ChaseArm);

	CockpitCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("CockpitCamera"));
	CockpitCamera->SetupAttachment(GetMesh());
	CockpitCamera->SetRelativeLocation(FVector(-10.f, -35.f, 115.f));  // je Modell im Blueprint anpassen
	CockpitCamera->SetActive(false);
}

void ALuxVehiclePawn::PossessedBy(AController* NewController)
{
	Super::PossessedBy(NewController);
	if (const APlayerController* PC = Cast<APlayerController>(NewController))
	{
		if (auto* Subsystem = ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(PC->GetLocalPlayer()))
		{
			if (VehicleMappingContext) Subsystem->AddMappingContext(VehicleMappingContext, 1);
		}
	}
}

void ALuxVehiclePawn::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);
	UEnhancedInputComponent* Input = Cast<UEnhancedInputComponent>(PlayerInputComponent);
	if (!Input) return;
	if (ThrottleAction)
	{
		Input->BindAction(ThrottleAction, ETriggerEvent::Triggered, this, &ALuxVehiclePawn::Throttle);
		Input->BindAction(ThrottleAction, ETriggerEvent::Completed, this, &ALuxVehiclePawn::Throttle);
	}
	if (BrakeAction)
	{
		Input->BindAction(BrakeAction, ETriggerEvent::Triggered, this, &ALuxVehiclePawn::Brake);
		Input->BindAction(BrakeAction, ETriggerEvent::Completed, this, &ALuxVehiclePawn::Brake);
	}
	if (SteerAction)
	{
		Input->BindAction(SteerAction, ETriggerEvent::Triggered, this, &ALuxVehiclePawn::Steer);
		Input->BindAction(SteerAction, ETriggerEvent::Completed, this, &ALuxVehiclePawn::Steer);
	}
	if (HandbrakeAction)
	{
		Input->BindAction(HandbrakeAction, ETriggerEvent::Started, this, &ALuxVehiclePawn::HandbrakeOn);
		Input->BindAction(HandbrakeAction, ETriggerEvent::Completed, this, &ALuxVehiclePawn::HandbrakeOff);
	}
	if (ToggleCameraAction)
		Input->BindAction(ToggleCameraAction, ETriggerEvent::Started, this, &ALuxVehiclePawn::ToggleCamera);
}

void ALuxVehiclePawn::Throttle(const FInputActionValue& Value) { GetVehicleMovementComponent()->SetThrottleInput(Value.Get<float>()); }
void ALuxVehiclePawn::Brake(const FInputActionValue& Value) { GetVehicleMovementComponent()->SetBrakeInput(Value.Get<float>()); }
void ALuxVehiclePawn::Steer(const FInputActionValue& Value) { GetVehicleMovementComponent()->SetSteeringInput(Value.Get<float>()); }
void ALuxVehiclePawn::HandbrakeOn() { GetVehicleMovementComponent()->SetHandbrakeInput(true); }
void ALuxVehiclePawn::HandbrakeOff() { GetVehicleMovementComponent()->SetHandbrakeInput(false); }

void ALuxVehiclePawn::ToggleCamera()
{
	const bool bCockpit = !CockpitCamera->IsActive();
	CockpitCamera->SetActive(bCockpit);
	ChaseCamera->SetActive(!bCockpit);
}

float ALuxVehiclePawn::GetSpeedKmh() const
{
	return GetVehicleMovementComponent()->GetForwardSpeed() * 0.036f;  // cm/s -> km/h
}
