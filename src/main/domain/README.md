# Domain Layer

This directory hosts pure domain contracts and business use-case interfaces.
Concrete adapters in `../services` and infrastructure concerns under `../infra`
should depend on these definitions to keep the main process layered and testable.
