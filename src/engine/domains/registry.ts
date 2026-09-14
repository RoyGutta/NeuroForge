/**
 * Registry of engineering domains. Adding a domain means implementing
 * `EngineeringDomain` and listing it here; nothing else in the engine changes.
 */
import type { DomainId, EngineeringProblem, ValidationIssue } from "../core/problem";
import type { CompiledProblem, EngineeringDomain } from "./domain";
import { structuralDomain } from "./structural";

const DOMAINS: Record<string, EngineeringDomain> = {
  structural: structuralDomain as EngineeringDomain,
};

export function getDomain(id: DomainId | string): EngineeringDomain | undefined {
  return DOMAINS[id];
}

export function listDomains(): EngineeringDomain[] {
  return Object.values(DOMAINS);
}

export function validateProblem(problem: EngineeringProblem): ValidationIssue[] {
  const domain = getDomain(problem.domain);
  if (!domain) return [{ path: "domain", message: `unknown domain "${problem.domain}"` }];
  return domain.validate(problem);
}

export function compileProblem(problem: EngineeringProblem): CompiledProblem {
  const domain = getDomain(problem.domain);
  if (!domain) throw new Error(`unknown domain "${problem.domain}"`);
  return domain.compile(problem);
}
