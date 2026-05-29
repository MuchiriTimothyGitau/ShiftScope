export interface APISignature {
  name: string;
  parameters: string[];
  returnType: string;
  isDeprecated: boolean;
}

export interface APIDiffResult {
  added: APISignature[];
  deleted: APISignature[];
  modifiedSignatures: {
    name: string;
    old: APISignature;
    new: APISignature;
    changeDetails: string[];
  }[];
  isBreaking: boolean;
}

export class APISurfaceDiffUtility {
  static diff(oldSignatures: Record<string, APISignature>, newSignatures: Record<string, APISignature>): APIDiffResult {
    const added: APISignature[] = [];
    const deleted: APISignature[] = [];
    const modifiedSignatures: APIDiffResult['modifiedSignatures'] = [];

    for (const [name, oldSig] of Object.entries(oldSignatures)) {
      const newSig = newSignatures[name];
      if (!newSig) {
        deleted.push(oldSig);
      } else {
        const changeDetails: string[] = [];
        if (JSON.stringify(oldSig.parameters) !== JSON.stringify(newSig.parameters)) {
          changeDetails.push(`Parameters changed from (${oldSig.parameters.join(', ')}) to (${newSig.parameters.join(', ')})`);
        }
        if (oldSig.returnType !== newSig.returnType) {
          changeDetails.push(`Return type changed from '${oldSig.returnType}' to '${newSig.returnType}'`);
        }
        if (!oldSig.isDeprecated && newSig.isDeprecated) {
          changeDetails.push('Method marked as deprecated');
        }
        if (changeDetails.length > 0) {
          modifiedSignatures.push({ name, old: oldSig, new: newSig, changeDetails });
        }
      }
    }

    for (const [name, newSig] of Object.entries(newSignatures)) {
      if (!oldSignatures[name]) added.push(newSig);
    }

    return { added, deleted, modifiedSignatures, isBreaking: deleted.length > 0 || modifiedSignatures.length > 0 };
  }

  static extractSignaturesFromMetadata(rawMetadata: any): Record<string, APISignature> {
    const signatures: Record<string, APISignature> = {};
    if (!rawMetadata || typeof rawMetadata !== 'object') return signatures;
    for (const [key, value] of Object.entries(rawMetadata)) {
      if (value && typeof value === 'object') {
        const val = value as any;
        signatures[key] = {
          name: key,
          parameters: Array.isArray(val.params) ? val.params.map(String) : [],
          returnType: typeof val.returns === 'string' ? val.returns : 'any',
          isDeprecated: Boolean(val.deprecated),
        };
      } else {
        signatures[key] = { name: key, parameters: [], returnType: 'any', isDeprecated: false };
      }
    }
    return signatures;
  }
}
