# LUX98 – Baut NUR den engine-unabhaengigen Kern und seine Tests (ohne Unreal).
# Das eigentliche Spiel wird ueber Luxembourg1998.uproject mit Unreal Build Tool gebaut.
cmake_minimum_required(VERSION 3.20)
project(Lux98Core CXX)

set(CMAKE_CXX_STANDARD 20)  # wie Unreal Engine 5
set(CMAKE_CXX_STANDARD_REQUIRED ON)

set(LUXCORE_DIR ${CMAKE_CURRENT_SOURCE_DIR}/Source/Luxembourg1998/Core)
file(GLOB LUXCORE_SOURCES ${LUXCORE_DIR}/Private/LuxCore/*.cpp)

add_library(LuxCore STATIC ${LUXCORE_SOURCES})
target_include_directories(LuxCore PUBLIC ${LUXCORE_DIR}/Public)
if(MSVC)
  target_compile_options(LuxCore PRIVATE /W4 /WX)
else()
  target_compile_options(LuxCore PRIVATE -Wall -Wextra -Wpedantic -Werror)
endif()

enable_testing()
add_executable(lux98_core_tests Tests/core/core_tests.cpp)
target_link_libraries(lux98_core_tests PRIVATE LuxCore)
add_test(NAME lux98_core_tests COMMAND lux98_core_tests)
