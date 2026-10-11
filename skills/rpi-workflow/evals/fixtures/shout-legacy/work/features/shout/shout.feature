Feature: Shout
  As a library caller
  I want an upper-case greeting
  So that banners stand out

  Scenario: Shouting a greeting
    When the shouted greeting for "Ada" is requested
    Then the result is "HELLO, ADA!"
