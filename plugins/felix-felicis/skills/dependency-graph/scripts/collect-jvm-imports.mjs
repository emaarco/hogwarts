#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { dirname, extname, join } from "node:path"

const sourceRoot = process.argv[2]?.replace(/\/+$/, "")
if (!sourceRoot || !existsSync(sourceRoot)) {
  console.error("usage: collect-jvm-imports.mjs <source-root>   (prints dependency-cruiser compatible JSON)")
  process.exit(2)
}

const JVM_EXTENSIONS = new Set([".java", ".kt"])
const PACKAGE_PATTERN = /^\s*package\s+([\w.]+)/m
const IMPORT_PATTERN = /^\s*import\s+(?:static\s+)?([\w.]+?)(\.\*)?(?:\s+as\s+\w+)?\s*;?\s*$/gm

const listSourceFiles = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name)
    if (entry.isDirectory()) return listSourceFiles(entryPath)
    return JVM_EXTENSIONS.has(extname(entry.name)) ? [entryPath] : []
  })

const parseSourceFile = (filePath) => {
  const content = readFileSync(filePath, "utf8")
  const imports = [...content.matchAll(IMPORT_PATTERN)].map(([, qualifiedName, wildcard]) => ({
    qualifiedName,
    isWildcard: Boolean(wildcard),
  }))
  return { filePath, packageName: content.match(PACKAGE_PATTERN)?.[1] ?? "", imports }
}

const mostCommon = (values) => {
  const countByValue = new Map()
  for (const value of values) countByValue.set(value, (countByValue.get(value) ?? 0) + 1)
  return [...countByValue.entries()].sort((entryA, entryB) => entryB[1] - entryA[1])[0][0]
}

const sourceFiles = listSourceFiles(sourceRoot).sort().map(parseSourceFile)

const directoriesByPackage = new Map()
for (const { filePath, packageName } of sourceFiles) {
  if (!directoriesByPackage.has(packageName)) directoriesByPackage.set(packageName, [])
  directoriesByPackage.get(packageName).push(dirname(filePath))
}
const directoryOfPackage = new Map([...directoriesByPackage].map(([packageName, directories]) => [packageName, mostCommon(directories)]))

const resolveImport = ({ qualifiedName, isWildcard }) => {
  if (isWildcard && directoryOfPackage.has(qualifiedName)) return join(directoryOfPackage.get(qualifiedName), "*")
  const nameSegments = qualifiedName.split(".")
  for (let packageLength = nameSegments.length - 1; packageLength > 0; packageLength -= 1) {
    const packageName = nameSegments.slice(0, packageLength).join(".")
    if (!directoryOfPackage.has(packageName)) continue
    const directory = directoryOfPackage.get(packageName)
    const typeName = nameSegments[packageLength]
    const typeFile = [".kt", ".java"].map((extension) => join(directory, `${typeName}${extension}`)).find(existsSync)
    return typeFile ?? join(directory, typeName)
  }
  return undefined
}

const modules = sourceFiles.map(({ filePath, imports }) => ({
  source: filePath,
  dependencies: imports
    .map((importStatement) => ({ importStatement, resolved: resolveImport(importStatement) }))
    .filter(({ resolved }) => resolved !== undefined)
    .map(({ importStatement, resolved }) => ({
      module: importStatement.qualifiedName,
      resolved,
      dependencyTypes: ["local", "import"],
      dynamic: false,
      coreModule: false,
      couldNotResolve: false,
    })),
}))

process.stdout.write(JSON.stringify({ modules }, null, 2))
