Feature: Polite
  As a library caller
  I want calmer greetings
  So that messages read politely

  Scenario: Greeting ends with a period
    When the greeting for "Ada" is requested
    Then the result is "Hello, Ada."
