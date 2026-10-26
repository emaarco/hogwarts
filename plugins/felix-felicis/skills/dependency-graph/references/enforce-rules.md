# Enforcing the layering

For TS/JS use dependency-cruiser or ArchUnitTS, for Java/Kotlin ArchUnit or Konsist. The layer order from the graph run becomes one rule per layer: **a layer may not import any layer above it**. A strict top-to-bottom order also rules out folder cycles, so cycle checks only need to catch file-level cycles inside a folder.

Pick the tool the repo already uses for tests; with neither in place, prefer dependency-cruiser (no test runner needed, one CI command).

Example below: layers `commands → ops → model → shared` under `src/`.

## dependency-cruiser

`.dependency-cruiser.cjs`, run in CI as `npx depcruise src --config .dependency-cruiser.cjs`:

```js
const layersTopToBottom = ["commands", "ops", "model", "shared"]

const upwardImportRules = layersTopToBottom.slice(1).map((layer, index) => ({
  name: `no-upward-import-from-${layer}`,
  severity: "error",
  from: { path: `^src/${layer}/` },
  to: { path: `^src/(${layersTopToBottom.slice(0, index + 1).join("|")})/` },
}))

module.exports = {
  forbidden: [
    ...upwardImportRules,
    { name: "no-circular", severity: "error", from: {}, to: { circular: true } },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
  },
}
```

Existing violations: generate a baseline with `npx depcruise src --config .dependency-cruiser.cjs --output-type baseline --output-to .dependency-cruiser-known-violations.json` and pass `--ignore-known` in CI, so the gate blocks new leaks while the known ones are paid down.

## ArchUnitTS

`test/architecture.test.ts` (Vitest needs `globals: true`):

```ts
import { projectFiles } from "archunit"

const layersTopToBottom = ["commands", "ops", "model", "shared"]

describe("layering", () => {
  layersTopToBottom.forEach((layer, index) => {
    layersTopToBottom.slice(0, index).forEach((upperLayer) => {
      it(`${layer} does not import ${upperLayer}`, async () => {
        const rule = projectFiles().inFolder(`src/${layer}/**`).shouldNot().dependOnFiles().inFolder(`src/${upperLayer}/**`)
        await expect(rule).toPassAsync()
      })
    })
  })

  it("has no import cycles", async () => {
    const rule = projectFiles().inFolder("src/**").should().haveNoCycles()
    await expect(rule).toPassAsync()
  })
})
```

## JVM: ArchUnit (Java and Kotlin)

Runs on compiled classes, in the module's test sources (`com.tngtech.archunit:archunit-junit5`):

```kotlin
@AnalyzeClasses(packages = ["com.example.service"])
class ArchitectureTest {

    @ArchTest
    val layers: ArchRule = layeredArchitecture().consideringOnlyDependenciesInLayers()
        .layer("Adapter").definedBy("..adapter..")
        .layer("Application").definedBy("..application..")
        .layer("Domain").definedBy("..domain..")
        .whereLayer("Adapter").mayNotBeAccessedByAnyLayer()
        .whereLayer("Application").mayOnlyBeAccessedByLayers("Adapter")
        .whereLayer("Domain").mayOnlyBeAccessedByLayers("Application", "Adapter")

    @ArchTest
    val domainAggregatesFreeOfCycles: ArchRule =
        slices().matching("com.example.service.domain.(*)..").should().beFreeOfCycles()
}
```

`slices().matching(...)` is the folder-level cycle check: one slice per subpackage, the same grouping as the graph at depth 2.

## JVM: Konsist (Kotlin, reads source)

No build needed, the same view as the graph. Test module with `com.lemonappdev:konsist`:

```kotlin
@Test
fun `layers are respected`() {
    Konsist.scopeFromProject().assertArchitecture {
        val domain = Layer("Domain", "com.example.service.domain..")
        val application = Layer("Application", "com.example.service.application..")
        val adapter = Layer("Adapter", "com.example.service.adapter..")
        domain.dependsOnNothing()
        application.dependsOn(domain)
        adapter.dependsOn(application, domain)
    }
}
```

Hexagonal setups are rarely a strict line (services wiring outbound adapters, for example): write the allowed exceptions into the rule explicitly instead of dropping the layer check.

## Hand-off

To wire either one in as a CI gate (with a shrink-only baseline for known violations), hand off to the `guardrails-setup` skill.
