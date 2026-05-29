const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('phone-sms/providers/registry.js', 'utf8');
const nexSmsSource = fs.readFileSync('phone-sms/providers/nexsms.js', 'utf8');

function loadRegistry(root = {}) {
  return new Function('self', `${source}; return self.PhoneSmsProviderRegistry;`)(root);
}

test('phone sms provider registry normalizes ids, order and labels consistently', () => {
  const registry = loadRegistry({
    PhoneSmsHeroSmsProvider: {
      createProvider: (deps = {}) => ({ provider: 'hero-sms', deps }),
    },
    PhoneSmsFiveSimProvider: {
      createProvider: (deps = {}) => ({ provider: '5sim', deps }),
    },
    PhoneSmsNexSmsProvider: {
      createProvider: (deps = {}) => ({ provider: 'nexsms', deps }),
    },
    PhoneSmsMaDaoProvider: {
      createProvider: (deps = {}) => ({ provider: 'madao', deps }),
    },
  });

  assert.deepStrictEqual(registry.getProviderIds(), ['hero-sms', '5sim', 'nexsms', 'madao']);
  assert.equal(registry.normalizeProviderId(' NEXSMS '), 'nexsms');
  assert.equal(registry.normalizeProviderId(' MaDao '), 'madao');
  assert.equal(registry.normalizeProviderId('unknown-provider'), 'hero-sms');
  assert.equal(registry.getProviderLabel('nexsms'), 'NexSMS');
  assert.equal(registry.getProviderLabel('madao'), 'MaDao');
  assert.equal(registry.getProviderDefinition('nexsms').moduleKey, 'PhoneSmsNexSmsProvider');
  assert.equal(registry.getProviderDefinition('madao').moduleKey, 'PhoneSmsMaDaoProvider');
  assert.deepStrictEqual(
    registry.normalizeProviderOrder([
      { provider: 'madao' },
      { provider: 'nexsms' },
      { id: '5sim' },
      { value: 'hero-sms' },
      'MADAO',
      'NEXSMS',
    ]),
    ['madao', 'nexsms', '5sim', 'hero-sms']
  );
  assert.deepStrictEqual(
    registry.normalizeProviderOrder([], ['madao', 'nexsms', '5sim', 'nexsms']),
    ['madao', 'nexsms', '5sim']
  );
  assert.deepStrictEqual(
    registry.createProvider('5sim', { foo: 1 }),
    { provider: '5sim', deps: { foo: 1 } }
  );
  assert.deepStrictEqual(
    registry.createProvider('madao', { foo: 2 }),
    { provider: 'madao', deps: { foo: 2 } }
  );
  assert.deepStrictEqual(
    registry.createProvider('nexsms', { foo: 3 }),
    { provider: 'nexsms', deps: { foo: 3 } }
  );
});

test('phone sms provider registry creates the real NexSMS provider module', () => {
  const root = {};
  const nexSmsModule = new Function('self', `${nexSmsSource}; return self.PhoneSmsNexSmsProvider;`)(root);
  const registry = loadRegistry({
    PhoneSmsNexSmsProvider: nexSmsModule,
  });

  const provider = registry.createProvider('nexsms', { fetchImpl: async () => ({ ok: true, text: async () => '{}' }) });

  assert.equal(provider.id, 'nexsms');
  assert.equal(provider.label, 'NexSMS');
  assert.equal(provider.defaultServiceCode, 'ot');
  assert.deepStrictEqual(
    provider.normalizeCountryOrder(['1:Thailand', { id: 2, label: 'United States' }, '1:Duplicate']),
    [
      { id: 1, label: 'Thailand' },
      { id: 2, label: 'United States' },
    ]
  );
});
