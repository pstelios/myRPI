Feature: Greeting
  As a caller of the library
  I want a greeting for a name
  So that I can welcome people

  Scenario: Greeting a person
    When the greeting for "Ada" is requested
    Then the result is "Hello, Ada!"

  Scenario: Names are trimmed
    When the greeting for "  Ada  " is requested
    Then the result is "Hello, Ada!"
