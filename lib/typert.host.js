/**
 * Handwritten Typert Host contribution for the single Remote endpoint, registered
 * automatically by the Harness Typert loader through the `./typert` export.
 * @module
 */
import { catalogOverviewSchema, catalogRequestDescriptor, catalogRequestSchema } from './remote.js';
function namedSchema(name, schema) {
    return { name, create: () => schema };
}
export const TYPERT = {
    package: 'dsh-rea-gateway',
    face: 'host',
    schemas: [
        namedSchema('CatalogRequest', catalogRequestSchema),
        namedSchema('CatalogOverview', catalogOverviewSchema),
    ],
    model: { services: [], events: [], objects: [] },
    invocations: [catalogRequestDescriptor],
};
export default TYPERT;
