export class ImportNoRecipesError extends Error {
  constructor() {
    super();
    this.name = "ImportNoRecipesError";
  }
}

export class ImportBadFormatError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "ImportBadFormatError";
  }
}

export class ImportBadCredentialsError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = "ImportBadCredentialsError";
  }
}
