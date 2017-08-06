class TodosRepository {
  constructor({backend}) {
    this.backend = backend;
  }

  getTodos() {
    return this.backend.find().toArray();
  }
}

module.exports = TodosRepository;
