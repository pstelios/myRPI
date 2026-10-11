Feature: Volume
  As a library caller
  I want loud and quiet greetings
  So that I can match the tone

  Scenario: Shouting a greeting
    When the shouted greeting for "Ada" is requested
    Then the result is "HELLO, ADA!"

  Scenario: Whispering a greeting
    When the whispered greeting for "Ada" is requested
    Then the result is "hello, ada!"
