import React, { useState } from 'react';
import { View, StyleSheet, TextInput, ScrollView, Text, TouchableOpacity } from 'react-native';

const SearchFilter = ({ onSearch, onFilterChange, theme }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilters, setSelectedFilters] = useState([]);

  const filterOptions = [
    { id: 1, label: 'Active Only' },
    { id: 2, label: 'Last 7 Days' },
    { id: 3, label: 'High Priority' },
    { id: 4, label: 'Pending' },
  ];

  const handleSearch = (text) => {
    setSearchQuery(text);
    onSearch(text);
  };

  const toggleFilter = (filterId) => {
    const newFilters = selectedFilters.includes(filterId)
      ? selectedFilters.filter(id => id !== filterId)
      : [...selectedFilters, filterId];
    setSelectedFilters(newFilters);
    onFilterChange(newFilters);
  };

  return (
    <View style={[styles.container, theme.card]}>
      {/* Search Input */}
      <TextInput
        style={[styles.searchInput, theme.text, { color: theme.text.color }]}
        placeholder="Search records..."
        placeholderTextColor={theme.text.color}
        value={searchQuery}
        onChangeText={handleSearch}
      />

      {/* Filter Tags */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
      >
        {filterOptions.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            onPress={() => toggleFilter(filter.id)}
            style={[
              styles.filterTag,
              selectedFilters.includes(filter.id)
                ? styles.filterTagActive
                : styles.filterTagInactive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilters.includes(filter.id)
                  ? { color: '#fff' }
                  : { color: '#666' },
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Active Filters Display */}
      {selectedFilters.length > 0 && (
        <Text style={[styles.activeFiltersText, theme.text]}>
          {selectedFilters.length} filter(s) applied
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 14,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  filterTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  filterTagActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  filterTagInactive: {
    backgroundColor: '#f0f0f0',
    borderColor: '#ddd',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  activeFiltersText: {
    fontSize: 12,
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default SearchFilter;
