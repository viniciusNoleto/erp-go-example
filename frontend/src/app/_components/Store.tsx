import { UtilsFor } from '@/components/utils/For';

/** Um dos dois bancos, na seção da arquitetura. */
export function Store({ name, role, items }: { name: string; role: string; items: string[] }) {
  return (
    <div className="glass p-8 max-sm:px-5 max-sm:py-5.5">
      <h3 className="font-serif text-40 leading-none font-normal">
        {name}
      </h3>

      <p className="mt-2 mb-5 text-18 text-night-gold">
        {role}
      </p>

      <ul className="text-16 text-night-soft">
        <UtilsFor
          each={items}
          eachKey={({ item }) => item}
        >
          {({ item }) => (
            <li className="border-t border-white/12 py-2.5">
              {item}
            </li>
          )}
        </UtilsFor>
      </ul>
    </div>
  );
}
