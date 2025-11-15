import React, { useState } from 'react';

const alphabet = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];

const BrandIndex = ({ brands, settings }) => {

  const [searchQuery, setSearchQuery] = useState('');
  const [activeLetter, setActiveLetter] = useState(null);

  const groupedBrands = brands.reduce((acc, brand) => {
    const firstLetter = brand.title?.[0]?.toUpperCase() || '';
    if (!acc[firstLetter]) acc[firstLetter] = [];
    acc[firstLetter].push(brand);
    return acc;
  }, {});

  const filtered = Object.entries(groupedBrands)
    .filter(([letter]) => !activeLetter || letter === activeLetter)
    .map(([letter, items]) => ({
      letter,
      items: items.filter(b =>
        b.title?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    }))
    .filter(group => group.items.length > 0);

  const activeLetters = Object.keys(groupedBrands);

  return (
    <div id="brand-app" className={`
    brand-layout-${settings?.layout?.pageLayout}
    schema-${settings?.layout?.colourScheme}
    ${settings?.layout?.featuredCarousel != 'hidden' ? 'featured-carousel' : ''}
    ${settings?.layout?.scrollPage != 'hidden' ? 'scroll-page' : ''}
    ${settings?.layout?.disabledLetters != 'hidden' ? 'disabled-letters' : ''}
    ${settings?.layout?.letterSpace ?? ''}
    ${settings?.layout?.searchBar != 'hidden' ? 'visible-search-bar' : ''}
    ${settings?.layout?.scrollTop != 'hidden' ? 'scroll-top' : ''}
    `}>
      {settings?.layout?.featuredCarousel && (() => {
        const featuredBrands = filtered
          .flatMap(({ items }) =>
            items.filter((brand) => brand.image && brand.status === "Featured")
          )

        return (
          featuredBrands.length > 0 && (
            <>
              <div id="carousel-nav-container">
                <div id="carousel-nav-left">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                    <path d="M15.293 3.293 6.586 12l8.707 8.707 1.414-1.414L9.414 12l7.293-7.293-1.414-1.414z" />
                  </svg>
                </div>
                <div id="carousel-nav-right">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                    <path d="M7.293 4.707 14.586 12l-7.293 7.293 1.414 1.414L17.414 12 8.707 3.293 7.293 4.707z" />
                  </svg>
                </div>
              </div>

              <div id="brands-carousel" className="images-container hide-scroll">
                {featuredBrands.map((brand) => (
                  <a className="carousel-link" key={brand.id} href={brand.url || '#'}>
                    <div className="image-wrapper">
                      <img
                        src={brand.image}
                        alt={brand.title}
                        className="featured-image"
                        loading="lazy"
                      />
                    </div>
                    <div className="featured-title">{brand.title}</div>
                  </a>
                ))}
              </div>
            </>
          )
        );
      })()}

      {/* Shortcut Alphabet */}
      {settings.layout.pageLayout != "simple-catalogue" && settings.layout.scrollPage ?
        <div className="shortcuts-container hide-scroll">
          <div className="shortcuts">
            {alphabet.map(letter => {
              const isActive = activeLetters.includes(letter);

              if (!isActive && !settings.layout.disabledLetters) {
                return null;
              }

              const isDisabled = !isActive && settings.layout.disabledLetters;

              return (
                <div
                  key={letter}
                  id={`shortcut-${letter}`}
                  className={`shortcut-letter ${letter === activeLetter ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
                  onClick={() => !isDisabled && setActiveLetter(letter === activeLetter ? null : letter)}
                  to-term={letter}
                  aria-disabled={isDisabled}
                  {...(isDisabled ? { disabled: true } : {})}
                >
                  {letter}
                </div>
              );
            })}

          </div>
        </div>
        : null}

      {/* Search */}
      {settings?.layout?.searchBar == true ?
        settings.layout.pageLayout != "catalogue" && settings.layout.pageLayout != "simple-catalogue" ?
          <div id="search-wrapper" className="search-wrapper">
            <svg className="search-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
              <path d="m29.43 25.39-6.9-6.9A10.86 10.86 0 0 0 24 13a11 11 0 1 0-5.5 9.52l6.91 6.9a2.06 2.06 0 0 0 1.48.59 3.18 3.18 0 0 0 2.17-1 2.6 2.6 0 0 0 .37-3.62zM18.43 20.21A8.89 8.89 0 0 1 13 22a9 9 0 1 1 7.23-3.65 9.33 9.33 0 0 1-1.8 1.86z" style={{ fill: '#757575' }} />
            </svg>
            <input
              type="text"
              id="brand-search"
              style={{ fontSize: '16px' }}
              autoComplete="off"
              placeholder={settings.seo.searchPage.searchPlaceholder || "Search brands"}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            <div id="cancel-button" onClick={() => setSearchQuery('')}>
              <svg className="cancel-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 18 18">
                <path d="m2.828 17.828 6.086-6.086L15 17.828 17.828 15l-6.086-6.086 6.086-6.086L15 0 8.914 6.086 2.828 0 0 2.828l6.085 6.086L0 15l2.828 2.828z" />
              </svg>
            </div>
          </div>
          : null
        : null
      }

      <div id="sbp-brands-wrapper" className="brands-wrapper">
        {filtered.length === 0 ? (
          <div id="no-results" style={{ display: 'block' }}>
            <h3>{settings.seo.searchPage.noResultsTitle}</h3>
            <p>
              {settings.seo.searchPage.noResultsDescription}
            </p>
          </div>
        ) : (
          settings.layout.pageLayout === "simple-catalogue" ? (
            <div className="brands">
              {filtered
                .flatMap(({ items }) => items.filter(brand => brand.image && brand.status != "Featured"))
                .map(brand => (
                  <a key={brand.id} href={brand.url || '#'}>
                    <div className="catalogue-wrapper">
                      <div
                        className="catalogue-image"
                        style={{ backgroundImage: `url(${brand.image})` }}
                      ></div>
                    </div>
                    <p>{brand.title}</p>
                  </a>
                ))}
            </div>
          ) : (
            filtered.map(({ letter, items }) => {
              const hasImageBrands = items.some(brand => brand.image);

              if (settings.layout.pageLayout === "catalogue" && !hasImageBrands) return null;

              return (
                <div key={letter} className="brand-section" term={letter}>
                  <div id={`term-${letter}`} className="letter">{letter}</div>
                  <div className="brands">
                    {settings.layout.pageLayout === "catalogue"
                      ? items.map(brand =>
                        brand.image ? (
                          <a key={brand.id} href={brand.url || '#'}>
                            <div className="catalogue-wrapper" title={brand.title}>
                              <div
                                className="catalogue-image"
                                style={{ backgroundImage: `url(${brand.image})` }}
                              ></div>
                            </div>
                            <p>{brand.title}</p>
                          </a>
                        ) : null
                      )
                      : items.map(brand => (
                        <a key={brand.id} href={brand.url || '#'}>
                          <div className="brand" title={brand.title}>
                            {brand.title}
                          </div>
                        </a>
                      ))}
                  </div>
                </div>
              );
            })
          )
        )}
        <div id="no-results" style={{ display: 'none' }}>
          <h3>{settings.seo.searchPage.noResultsTitle}</h3>
          <p>
            {settings.seo.searchPage.noResultsDescription}
          </p>
        </div>
      </div>
    </div>
  );
};

export default BrandIndex;
